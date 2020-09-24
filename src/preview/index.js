// @ts-nocheck

const chokidar = require('chokidar');
const express = require('express');
const path = require('path');
const request = require('request');
const ws = require('ws');

const api = require('../utils/api');
const AuthGenerator = require('../utils/auth-generator');
const { LIFERAY_GROUPID_VAR, LIFERAY_HOST_VAR } = require('../utils/constants');
const { log } = require('../utils/log');
const {
  default: getProjectContent,
} = require('../utils/project-content/get-project-content');

const DEV_SERVER_PORT = 8081;
const SOCKET_SERVER_PORT = 8082;

module.exports = class extends AuthGenerator {
  /**
   * @param {any} args
   * @param {any} options
   */
  constructor(args, options) {
    super(args, options);

    /** @type {ws[]} */
    this._connectedSockets = [];
  }

  /**
   * @inheritdoc
   */
  async asking() {
    await super.asking();

    log('Checking site compatibility...', { newLine: true });

    if (await this._checkPreviewCompatibility()) {
      log('Found compatible Liferay Server', { level: 'success' });

      this._runExpressServer();
      this._runSocketServer();
      this._watchChanges();

      log('\nDevelopment server connected to liferay');
      log('Visit preview URL and start developing to your fragments');

      log('Liferay Server URL', {
        newLine: true,
        data: this._getValue(LIFERAY_HOST_VAR) || '',
      });

      log('Group ID', { data: this._getValue(LIFERAY_GROUPID_VAR) || '' });
      log('Preview URL', { data: `http://localhost:${DEV_SERVER_PORT}` });
    } else {
      log(
        '\nYour Liferay Server cannot generate fragment previews.' +
          '\nUpdate it to a more recent version to use this feature.' +
          '\nCheck your OAuth2 plugin version too, it should be >= 2.0.0.' +
          '\nDownload a new version here: https://web.liferay.com/es/marketplace/-/mp/application/109571986.' +
          '\n\nIf this an error, please report an issue at' +
          '\nhttps://www.npmjs.com/package/generator-liferay-fragments',
        { level: 'error' }
      );
    }
  }

  /**
   * Checks if given liferay site is compatible with fragment preview
   * @return {Promise<boolean>} true if it is compatible, false otherwise
   */
  async _checkPreviewCompatibility() {
    try {
      const preview = await this._getFragmentPreview(
        '.test {}',
        '<test></test>',
        'test();',
        '{fieldSets:[]}'
      );

      if (
        typeof preview === 'string' &&
        preview.indexOf('.test {}') !== -1 &&
        preview.indexOf('<test></test>') !== -1 &&
        preview.indexOf('test();') !== -1
      ) {
        return true;
      }
    } catch (_) {}

    return false;
  }

  /**
   * Get's a preview of the given composition using configured GroupID
   * @param {object} definition Composition's definition
   * @return {Promise<string | object>} Composition's generated preview
   */
  _getCompositionPreview(definition) {
    const groupId = this._getValue(LIFERAY_GROUPID_VAR);

    if (groupId) {
      return api.renderCompositionPreview(groupId, definition);
    }

    return Promise.reject(new Error('GroupId not found'));
  }

  /**
   * Get's a preview of the given fragment using configured GroupID
   * @param {string} css Fragment's CSS
   * @param {string} html Fragment's HTML
   * @param {string} js Fragments's JS
   * @param {string} configuration Fragments's configuration
   * @return {Promise<string | object>} Fragment's generated preview
   */
  _getFragmentPreview(css, html, js, configuration) {
    const groupId = this._getValue(LIFERAY_GROUPID_VAR);

    if (groupId) {
      return api.renderFragmentPreview(groupId, html, css, js, configuration);
    }

    return Promise.reject(new Error('GroupId not found'));
  }

  /**
   * Get's a preview of the given page template using configured GroupID
   * @param {object} definition Page Template's definition
   * @return {Promise<string | object>} Page Template's generated preview
   */
  _getPageTemplatePreview(definition) {
    const groupId = this._getValue(LIFERAY_GROUPID_VAR);

    if (groupId) {
      return api.renderPageDefinitionPreview(groupId, definition);
    }

    return Promise.reject(new Error('GroupId not found'));
  }

  /**
   * Get's project content for generator's destinationPath
   * @return {import('../../types/index').IProject} Project content
   */
  _getProjectContent() {
    return getProjectContent(this.destinationPath());
  }

  /**
   * Run express server for preview
   * URLS served by this server:
   *  - Any static file inside assets directory
   *  - /fragment-preview?collection=<>&fragment=<>: Gets a preview
   *  - /preview-constants.js: Gets server related constants in JS vars
   *  - *: Redirects these requests to liferay-portal
   */
  _runExpressServer() {
    const app = express();
    app.use(express.static(path.join(__dirname, 'assets')));

    let collectionId = '';
    let fragmentId = '';
    let pageTemplateId = '';

    app.get('/fragment-preview', (request, response) => {
      collectionId = request.query.collection;
      fragmentId = request.query.fragment;
      pageTemplateId = request.query.pageTemplate;

      const type = request.query.type;

      const projectContent = this._getProjectContent();

      const collection = projectContent.collections.find(
        (collection) => collection.slug === collectionId
      );

      if (collection) {
        const fragment =
          type === 'fragment'
            ? collection.fragments.find(
                (fragment) => fragment.slug === fragmentId
              )
            : collection.fragmentCompositions.find(
                (composition) => composition.slug === fragmentId
              );

        if (fragment && type === 'fragment') {
          this._getFragmentPreview(
            fragment.css,
            fragment.html,
            fragment.js,
            fragment.configuration
          ).then((preview) => {
            response.send(this._replaceLinks(preview));
          });
        } else if (fragment && type === 'composition') {
          this._getCompositionPreview(JSON.parse(fragment.definitionData)).then(
            (preview) => {
              response.send(this._replaceLinks(preview));
            }
          );
        }
      } else if (pageTemplateId && type === 'page-template') {
        const pageTemplate = projectContent.pageTemplates.find(
          (pageTemplate) => pageTemplate.slug === pageTemplateId
        );

        if (pageTemplate) {
          this._getPageTemplatePreview(
            JSON.parse(pageTemplate.definitionData)
          ).then((preview) => {
            response.send(this._replaceLinks(preview));
          });
        }
      } else {
        response.send('');
      }
    });

    app.get('/preview-constants.js', (request, response) => {
      response.send(`
        window.DEV_SERVER_PORT = ${DEV_SERVER_PORT};
        window.SOCKET_SERVER_PORT = ${SOCKET_SERVER_PORT};
      `);
    });

    app.get('*', (req, res) => {
      const resourceId = /\[resources:(.+)\]/.exec(req.originalUrl);

      if (resourceId && resourceId.length > 1) {
        res.sendFile(
          path.join(
            this.destinationPath(),
            'src',
            collectionId,
            fragmentId,
            'resources',
            resourceId[1]
          )
        );
      } else {
        const url = `${this._getValue(LIFERAY_HOST_VAR)}${req.originalUrl}`;

        // @ts-ignore

        request(url, (error, response, body) => res.send(body));
      }
    });

    app.listen(DEV_SERVER_PORT);
  }

  /**
   * Replaces relative links in the preview HTML
   * @param {string} html HTML to replace the links
   */
  _replaceLinks(html) {
    return html.replace(
      /(src|href)=["']\/([^"']+)["']/gi,
      `$1="${this._getValue(LIFERAY_HOST_VAR)}/$2"`
    );
  }

  /**
   * Runs a socket server
   */
  _runSocketServer() {
    const socketServer = new ws.Server({ port: SOCKET_SERVER_PORT });

    socketServer.on('connection', (socket) => {
      this._connectedSockets = [...this._connectedSockets, socket];

      socket.send(JSON.stringify(this._getProjectContent()));

      socket.on('close', () => {
        this._connectedSockets = this._connectedSockets.filter(
          (_socket) => _socket !== socket
        );
      });
    });
  }

  /**
   * Updates all sockets when project has changed
   * @return {Promise} Watch promise
   */
  _watchChanges() {
    const watchPath = path.resolve(this.destinationPath(), 'src');

    return new Promise(() => {
      chokidar.watch(watchPath).on('all', async () => {
        const projectContent = this._getProjectContent();
        this._connectedSockets.forEach((socket) =>
          socket.send(JSON.stringify(projectContent))
        );
      });
    });
  }
};
