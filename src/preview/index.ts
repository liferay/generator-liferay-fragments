import chokidar from 'chokidar';
import express from 'express';
import path from 'path';
import request from 'request';
import ws from 'ws';

import api from '../utils/api';
import AuthGenerator from '../utils/auth-generator';
import { buildProjectContent } from '../utils/project-content/build-project-content';
import getProjectContent from '../utils/project-content/get-project-content';

const DEV_SERVER_PORT = 8081;
const SOCKET_SERVER_PORT = 8082;

export default class extends AuthGenerator {
  private _connectedSockets: ws[] = [];

  async asking(): Promise<void> {
    await super.asking();

    this.log('Checking site compatibility...', { newLine: true });

    if (await this._checkPreviewCompatibility()) {
      this.log('Found compatible Liferay Server', { level: 'success' });

      this._runExpressServer();
      this._runSocketServer();

      const watchPromise = this._watchChanges();

      this.log('\nDevelopment server connected to liferay');
      this.log('Visit preview URL and start developing to your fragments');

      this.log(`Liferay Server URL: ${this.getHost()}`);
      this.log(`Group ID: ${this.getGroupId()}`);
      this.log(`Preview URL: http://localhost:${DEV_SERVER_PORT}`);

      await watchPromise;
    } else {
      this.log(
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

  private async _checkPreviewCompatibility() {
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

  private _getCompositionPreview(
    definition: Record<string, any>
  ): Promise<string> {
    const groupId = this.getGroupId();

    if (groupId) {
      return api.renderCompositionPreview(groupId, definition);
    }

    return Promise.reject(new Error('GroupId not found'));
  }

  private _getFragmentPreview(
    css: string,
    html: string,
    js: string,
    configuration: string
  ): Promise<string> {
    const groupId = this.getGroupId();

    if (groupId) {
      return api.renderFragmentPreview(groupId, html, css, js, configuration);
    }

    return Promise.reject(new Error('GroupId not found'));
  }

  private _getPageTemplatePreview(definition: Record<string, any>) {
    const groupId = this.getGroupId();

    if (groupId) {
      return api.renderPageDefinitionPreview(groupId, definition);
    }

    return Promise.reject(new Error('GroupId not found'));
  }

  /**
   * Run express server for preview
   * URLS served by this server:
   *  - Any static file inside assets directory
   *  - /fragment-preview?collection=<>&fragment=<>: Gets a preview
   *  - /preview-constants.js: Gets server related constants in JS vars
   *  - *: Redirects these requests to liferay-portal
   */
  private _runExpressServer() {
    const app = express();
    app.use(express.static(path.join(__dirname, 'assets')));

    let collectionId = '';
    let fragmentId = '';
    let pageTemplateId = '';

    app.get('/fragment-preview', async (request, response) => {
      collectionId = request.query.collection?.toString() ?? '';
      fragmentId = request.query.fragment?.toString() ?? '';
      pageTemplateId = request.query.pageTemplate?.toString() ?? '';

      const projectContent = getProjectContent(this.destinationPath());
      const type = request.query.type;

      const collection = projectContent.collections.find(
        (collection) => collection.slug === collectionId
      );

      if (collection) {
        const fragment =
          type === 'fragment' &&
          collection.fragments.find((fragment) => fragment.slug === fragmentId);

        const fragmentComposition =
          type !== 'fragment' &&
          collection.fragmentCompositions?.find(
            (composition) => composition.slug === fragmentId
          );

        if (fragment && type === 'fragment') {
          if (fragment.metadata.type === 'react') {
            this.log(
              'React based fragments do not support preview command (yet)',
              { level: 'error' }
            );
          }

          this._getFragmentPreview(
            fragment.css,
            fragment.html,
            fragment.js,
            fragment.configuration
          ).then((preview) => {
            response.send(this._replaceLinks(preview));
          });
        } else if (fragmentComposition && type === 'composition') {
          this._getCompositionPreview(
            JSON.parse(fragmentComposition.definitionData)
          ).then((preview) => {
            response.send(this._replaceLinks(preview));
          });
        }
      } else if (pageTemplateId && type === 'page-template') {
        const pageTemplate = projectContent.pageTemplates?.find(
          (pageTemplate) => pageTemplate.slug === pageTemplateId
        );

        if (pageTemplate) {
          this._getPageTemplatePreview(
            JSON.parse(pageTemplate.definitionData)
          ).then((preview) => {
            response.send(this._replaceLinks(preview as string));
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
        const url = `${this.getHost()}${req.originalUrl}`;

        request(url, (error, response, body) => res.send(body));
      }
    });

    app.listen(DEV_SERVER_PORT);
  }

  private _replaceLinks(html: string) {
    return html.replace(
      /(src|href)=["']\/([^"']+)["']/gi,
      `$1="${this.getHost()}/$2"`
    );
  }

  private _runSocketServer() {
    const socketServer = new ws.Server({ port: SOCKET_SERVER_PORT });

    socketServer.on('connection', async (socket) => {
      this._connectedSockets = [...this._connectedSockets, socket];

      socket.send(JSON.stringify(getProjectContent(this.destinationPath())));

      socket.on('close', () => {
        this._connectedSockets = this._connectedSockets.filter(
          (_socket) => _socket !== socket
        );
      });
    });
  }

  private _watchChanges() {
    const watchPath = path.resolve(this.destinationPath(), 'src');

    return new Promise(() => {
      chokidar.watch(watchPath).on('all', async () => {
        const projectContent = getProjectContent(this.destinationPath());

        this._connectedSockets.forEach((socket) =>
          socket.send(JSON.stringify(projectContent))
        );
      });
    });
  }
}
