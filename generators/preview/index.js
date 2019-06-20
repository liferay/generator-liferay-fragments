const chokidar = require('chokidar');
const express = require('express');
const request = require('request');
const ws = require('ws');
const path = require('path');
const api = require('../../utils/api');
const AuthGenerator = require('../../utils/auth-generator');
const getProjectContent = require('../../utils/get-project-content');
const { log, logSecondary, logData, logError } = require('../../utils/log');

const {
  LIFERAY_HOST_VAR,
  LIFERAY_GROUPID_VAR
} = require('../../utils/constants');

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

    log('\nChecking site compatibility...');

    if (await this._checkPreviewCompatibility()) {
      log('Found compatible Liferay Server');

      this._runExpressServer();
      this._runSocketServer();
      this._watchChanges();

      logSecondary('\nDevelopment server connected to liferay');
      logSecondary('Visit preview URL and start developing to your fragments');

      log('');
      logData('Liferay Server URL', this._getValue(LIFERAY_HOST_VAR) || '');
      logData('Group ID', this._getValue(LIFERAY_GROUPID_VAR) || '');
      logData('Preview URL', `http://localhost:${DEV_SERVER_PORT}`);
    } else {
      logError(
        '\nYour Liferay Server cannot generate fragment previews.' +
          '\nUpdate it to a more recent version to use this feature.' +
          '\n\nIf this an error, please report an issue at' +
          '\nhttps://www.npmjs.com/package/generator-liferay-fragments'
      );
    }
  }

  /**
   * Checks if given liferay site is compatible with fragment preview
   * @return {Promise<boolean>} true if it is compatible, false otherwise
   */
  async _checkPreviewCompatibility() {
    try {
      const preview = await this._getPreview(
        '.test {}',
        '<test></test>',
        'test();'
      );

      if (
        typeof preview === 'string' &&
        preview.indexOf('.test {}') !== -1 &&
        preview.indexOf('<test></test>') !== -1 &&
        preview.indexOf('test();') !== -1
      ) {
        return true;
      }
    } catch (error) {}

    return false;
  }

  /**
   * Get's a preview of the given fragment using configured GroupID
   * @param {string} css Fragment's CSS
   * @param {string} html Fragment's HTML
   * @param {string} js Fragments's JS
   * @return {Promise<string>} Fragment's generated preview
   */
  _getPreview(css, html, js) {
    const groupId = this._getValue(LIFERAY_GROUPID_VAR);

    if (groupId) {
      return api.renderFragmentPreview(groupId, html, css, js);
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

    app.get('/fragment-preview', (request, response) => {
      collectionId = request.query.collection;
      fragmentId = request.query.fragment;
      const projectContent = this._getProjectContent();

      const collection = projectContent.collections.find(
        collection => collection.slug === collectionId
      );

      if (collection) {
        const fragment = collection.fragments.find(
          fragment => fragment.slug === fragmentId
        );

        if (fragment) {
          this._getPreview(fragment.css, fragment.html, fragment.js).then(
            preview => {
              response.send(preview);
            }
          );
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
   * Runks a socket server
   */
  _runSocketServer() {
    const socketServer = new ws.Server({ port: SOCKET_SERVER_PORT });

    socketServer.on('connection', socket => {
      this._connectedSockets = [...this._connectedSockets, socket];

      socket.send(JSON.stringify(this._getProjectContent()));

      socket.on('close', () => {
        this._connectedSockets = this._connectedSockets.filter(
          _socket => _socket !== socket
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

    return new Promise(() =>
      chokidar.watch(watchPath).on('all', async () => {
        const projectContent = this._getProjectContent();
        this._connectedSockets.forEach(socket =>
          socket.send(JSON.stringify(projectContent))
        );
      })
    );
  }
};
