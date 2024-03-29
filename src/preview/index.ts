import chokidar from 'chokidar';
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import ws from 'ws';

import api from '../utils/api';
import AuthGenerator from '../utils/auth-generator';
import getProjectContent from '../utils/project-content/get-project-content';

const DEV_SERVER_PORT = 8081;
const SOCKET_SERVER_PORT = 8082;

export default class extends AuthGenerator {
  private _connectedSockets: ws[] = [];

  async asking(): Promise<void> {
    await super.asking();

    this.logMessage('Checking site compatibility...', { newLine: true });

    if (await this._checkPreviewCompatibility()) {
      this.logMessage('Found compatible Liferay Server', { level: 'success' });

      this._runExpressServer();
      this._runSocketServer();

      const watchPromise = this._watchChanges();

      this.logMessage('\nDevelopment server connected to liferay');
      this.logMessage(
        'Visit preview URL and start developing to your fragments'
      );

      this.logMessage(`Liferay Server URL: ${this.getHost()}`);
      this.logMessage(`Group ID: ${this.getGroupId()}`);
      this.logMessage(`Preview URL: http://localhost:${DEV_SERVER_PORT}`);

      try {
        await watchPromise;
      } catch (error) {
        if (error instanceof Error) {
          this.logMessage(error.toString(), { level: 'error' });
        }
      }
    } else {
      this.logMessage(
        '\nYour Liferay Server cannot generate fragment previews.' +
          '\nUpdate it to a more recent version to use this feature.' +
          '\nCheck your OAuth2 plugin version too, it should be >= 2.0.0.' +
          '\nDownload a new version here: https://marketplace.liferay.com/p/liferay-plugin-for-oauth-2.0' +
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

      const collection = projectContent.collections.find(
        (collection) => collection.slug === collectionId
      );

      let preview = '';

      if (collection) {
        const fragment = collection.fragments.find(
          (fragment) => fragment.slug === fragmentId
        );

        const fragmentComposition = collection.fragmentCompositions?.find(
          (composition) => composition.slug === fragmentId
        );

        if (fragment) {
          if (fragment.metadata.type === 'react') {
            this.logMessage(
              'React based fragments do not support preview command (yet)',
              { level: 'error' }
            );
          }

          try {
            preview = await this._getFragmentPreview(
              fragment.css,
              fragment.html,
              fragment.js,
              fragment.configuration
            );
          } catch (error) {
            if (error instanceof Error) {
              this.logMessage(error.toString(), { level: 'error' });
            }
          }
        } else if (fragmentComposition) {
          try {
            preview = await this._getCompositionPreview(
              JSON.parse(fragmentComposition.definitionData)
            );
          } catch (error) {
            if (error instanceof Error) {
              this.logMessage(error.toString(), { level: 'error' });
            }
          }
        }
      } else if (pageTemplateId) {
        const pageTemplate = projectContent.pageTemplates?.find(
          (pageTemplate) => pageTemplate.slug === pageTemplateId
        );

        if (pageTemplate) {
          try {
            preview = await this._getPageTemplatePreview(
              JSON.parse(pageTemplate.definitionData)
            );
          } catch (error) {
            if (error instanceof Error) {
              this.logMessage(error.toString(), { level: 'error' });
            }
          }
        }
      }

      response.send(this._replaceLinks(preview));
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

        fetch(url).then((response) => {
          res.send(response);
        });
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
