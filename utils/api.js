const util = require('util');
const path = require('path');
const request = require('request');
const mime = require('mime-types');
const FormData = require('form-data');
const fs = require('fs');
const parseUrl = require('url').parse;
const {
  FRAGMENTS_PORTLET_ID,
  PORTLET_FILE_REPOSITORY
} = require('./constants');

const HOST_AUTH_PATTERN = /^https?:\/\/([a-z0-9-_]+):([a-z0-9-_]+)@/i;

const api = {
  _host: '',
  _basicAuthToken: '',

  /**
   * @type {import('../types/index').IOauthToken}
   */
  _oauthToken: {
    accessToken: '',
    refreshToken: '',
    expirationDate: new Date('1991-1-1')
  },

  /**
   * @param {'basic'|'oauth'} type
   */
  _getAuthorizationHeader(type) {
    const headers = [];

    if (HOST_AUTH_PATTERN.test(this._host)) {
      const [, user = '', pass = ''] = HOST_AUTH_PATTERN.exec(this._host) || [];

      headers.push(
        `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
      );
    }

    if (type === 'basic') {
      headers.push(`Basic ${this._basicAuthToken}`);
    } else if (type === 'oauth') {
      headers.push(`Bearer ${this._oauthToken.accessToken}`);
    }

    return headers.join(',');
  },

  /**
   * Initializes api
   * @param {string} host
   * @param {string} basicAuthToken
   * @param {import('../types/index').IServerOauthToken} [oauthToken]
   */
  init(host, basicAuthToken, oauthToken) {
    this._host = host;
    this._basicAuthToken = basicAuthToken;

    if (oauthToken) {
      const expirationDate = new Date();
      expirationDate.setSeconds(
        expirationDate.getSeconds() + oauthToken.expires_in - 60
      );

      this._oauthToken = {
        accessToken: oauthToken.access_token,
        refreshToken: oauthToken.refresh_token,
        expirationDate
      };
    }
  },

  /**
   * @param {'GET' | 'POST'} method
   * @param {string} url
   * @param {object} [options={}]
   * @return {Promise<object|string>}
   */
  async request(method, url, options = {}) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error(
        `Requests not available during testing (${method} ${url})`
      );
    }

    const promiseRequest = util.promisify(request);
    const opts = Object.assign(
      {},
      { method, url: `${this._host}${url}` },
      options
    );

    const response = await promiseRequest(opts, undefined);
    return this.parseResponse(response);
  },

  /**
   * @param {object} response
   * @param {number} response.statusCode
   * @param {string} response.body
   * @return {object|string}
   */
  parseResponse(response) {
    /** @type {object|string} */
    let responseBody = response.body;

    if (typeof responseBody === 'string') {
      try {
        responseBody = JSON.parse(response.body);
      } catch (error) {
        // If responseBody is not an object
        // we silently ignore
      }
    }

    if (typeof responseBody === 'object') {
      if (responseBody.error && responseBody.error.type) {
        const errorMessage = responseBody.error.message;
        let message = '';

        switch (responseBody.error.type) {
          case 'com.liferay.fragment.exception.FragmentEntryNameException':
            message = `Error in fragment.json: ${errorMessage}`;
            break;
          case 'com.liferay.fragment.exception.FragmentCollectionNameException':
            message = `Error in collection.json: ${errorMessage}`;
            break;
          case 'com.liferay.fragment.exception.FragmentEntryConfigurationException':
            message = `Error in fragment configuration:\n${errorMessage}`;
            break;
          case 'com.liferay.fragment.exception.DuplicateFragmentEntryKeyException':
            message =
              'Error in fragment.json: There is already a fragment with the same name';
            break;
          default:
            message = errorMessage;
            break;
        }

        if (message) {
          throw new Error(message);
        }
      }

      if ('exception' in responseBody) {
        throw new Error(responseBody.exception);
      }

      if ('error' in responseBody) {
        throw new Error(responseBody.error);
      }
    }

    if (response.statusCode >= 400) {
      throw new Error(`${response.statusCode} ${response.body}`);
    }

    return responseBody;
  },

  /**
   * @param {string} url
   * @param {object} [queryParameters = {}]
   * @param {object} [options={}]
   * @return {Promise<object|string>}
   */
  get(url, queryParameters = {}, options = {}) {
    const queryString = Object.entries(queryParameters)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return this.request('GET', `${url}?${queryString}`, options);
  },

  /**
   * @param {string} url
   * @param {object} [form={}]
   * @param {object} [options={}]
   * @return {Promise<object|string>}
   */
  postForm(url, form, options) {
    return this.request('POST', url, Object.assign({}, { form }, options));
  },

  /**
   * @param {string} url
   * @param {object} [formData={}]
   * @param {object} [options={}]
   * @return {Promise<object|string>}
   */
  postFormData(url, formData = {}, options = {}) {
    return this.request('POST', url, Object.assign({}, { formData }, options));
  },

  /**
   * @param {string} username
   * @param {string} password
   * @return {Promise<import('../types/index').IServerOauthToken>}
   */
  getOAuthToken(username, password) {
    return this.postForm('/o/oauth2/token', {
      grant_type: 'password', // eslint-disable-line camelcase
      client_id: 'FragmentRenderer', // eslint-disable-line camelcase
      username,
      password
    });
  },

  /**
   * Tries to refresh existing oauth2Token.
   * It existing token is invalid it sets it to null.
   */
  async refreshOAuthToken() {
    if (this._oauthToken.expirationDate < new Date()) {
      try {
        const oauthToken = await this.postForm('/o/oauth2/token', {
          client_id: 'FragmentRenderer', // eslint-disable-line camelcase
          grant_type: 'refresh_token', // eslint-disable-line camelcase
          refresh_token: this._oauthToken.refreshToken // eslint-disable-line camelcase
        });

        this.init(this._host, this._basicAuthToken, oauthToken);
      } catch (error) {
        this._oauthToken = {
          accessToken: '',
          refreshToken: '',
          expirationDate: new Date('1991-1-1')
        };
      }
    }
  },

  /**
   * Checks authentication with both BasicAuth and OAuth2
   * @return {Promise<void>}
   */
  async checkAuthentication() {
    await this.postFormData(
      '/api/jsonws/user/get-current-user',
      {},
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    );

    if (this._oauthToken.accessToken) {
      await this.postFormData(
        '/api/jsonws/user/get-current-user',
        {},
        {
          headers: { Authorization: this._getAuthorizationHeader('oauth') }
        }
      );
    }
  },

  /**
   * @return {Promise<import('../types/index').ICompany[]>}
   */
  getCompanies() {
    return this.postFormData(
      '/api/jsonws/company/get-companies',
      {},
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    );
  },

  /**
   * @param {string} companyId
   * @return {Promise<import('../types/index').ISiteGroup[]>}
   */
  getStagingCompanies(companyId) {
    return this.postFormData(
      `/api/jsonws/group/get-groups/company-id/${companyId}/parent-group-id/0/site/false`,
      {},
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    );
  },

  /**
   * @param {string} companyId
   * @return {Promise<import('../types/index').ISiteGroup[]>}
   */
  getSiteGroups(companyId) {
    return this.postFormData(
      `/api/jsonws/group/get-groups/company-id/${companyId}/parent-group-id/0/site/true`,
      {},
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    );
  },

  /**
   * @param {string} groupId
   * @param {string} fragmentCollectionId
   * @param {string} [name]
   * @return {Promise<import('../types/index').IServerFragment[]>}
   */
  getFragmentEntries(groupId, fragmentCollectionId, name) {
    /**
     * @type {import('../types/index').IGetFragmentEntriesOptions}
     */
    const options = {
      groupId,
      fragmentCollectionId,
      status: 0,
      start: -1,
      end: -1
    };

    if (name) {
      options.name = name;
    }

    return this.postFormData(
      '/api/jsonws/fragment.fragmententry/get-fragment-entries',
      options,
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    );
  },

  /**
   * @param {string} groupId
   * @param {string} fragmentCollectionId
   * @return {Promise<import('../types/index').IServerFragmentComposition[]>}
   */
  getFragmentCompositions(groupId, fragmentCollectionId) {
    const options = {
      groupId,
      fragmentCollectionId,
      start: -1,
      end: -1
    };

    return this.postFormData(
      '/api/jsonws/fragment.fragmentcomposition/get-fragment-compositions',
      options,
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    ).catch(() => {
      return [];
    });
  },

  /**
   * @param {string} groupId
   * @param {string} [name]
   * @return {Promise<import('../types/index').IServerCollection[]>}
   */
  getFragmentCollections(groupId, name) {
    /** @type {{ groupId: string, name?: string, start: number, end: number }} */
    const options = {
      groupId,
      start: -1,
      end: -1
    };

    if (name) {
      options.name = name;
    }

    return this.postFormData(
      '/api/jsonws/fragment.fragmentcollection/get-fragment-collections',
      options,
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    );
  },

  /**
   * @param {string} fragmentCollectionId
   * @param {string} name
   * @param {string} [description='']
   * @return {Promise<''>}
   */
  updateFragmentCollection(fragmentCollectionId, name, description = '') {
    return this.postFormData(
      '/api/jsonws/fragment.fragmentcollection/update-fragment-collection',
      {
        fragmentCollectionId,
        description,
        name
      },
      {
        headers: {
          Authorization: this._getAuthorizationHeader('basic')
        }
      }
    );
  },

  /**
   * @param {string} groupId
   * @param {string} fragmentCollectionKey
   * @param {string} name
   * @param {string} [description='']
   * @return {Promise<''>}
   */
  addFragmentCollection(
    groupId,
    fragmentCollectionKey,
    name,
    description = ''
  ) {
    return this.postFormData(
      '/api/jsonws/fragment.fragmentcollection/add-fragment-collection',
      {
        groupId,
        fragmentCollectionKey,
        name,
        description
      },
      {
        headers: {
          Authorization: this._getAuthorizationHeader('basic')
        }
      }
    );
  },

  /**
   * @param {string} fragmentEntryId
   * @param {{ status: number, name: string, html: string, css: string, js: string,  configuration: string, previewFileEntryId?: number}} data
   */
  updateFragmentEntry(
    fragmentEntryId,
    { status, name, html, css, js, configuration, previewFileEntryId = 0 }
  ) {
    return this.postFormData(
      '/api/jsonws/fragment.fragmententry/update-fragment-entry',
      {
        fragmentEntryId,
        status,
        name,
        html,
        css,
        js,
        configuration: configuration,
        previewFileEntryId
      },
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    );
  },

  /**
   * @param {string} groupId
   * @param {string} fragmentEntryKey
   * @param {string} thumbnailPath
   * @param {string} previewFileEntryId
   */
  async uploadThumbnail(
    groupId,
    fragmentEntryKey,
    thumbnailPath,
    previewFileEntryId = '0'
  ) {
    const bytes = JSON.stringify([...fs.readFileSync(thumbnailPath)]);

    const filename = `${groupId}_${fragmentEntryKey}_${path.basename(
      thumbnailPath
    )}`;

    let fileEntry;

    const repository = await this.postFormData(
      '/api/jsonws/repository/get-repository',
      {
        groupId,
        portletId: FRAGMENTS_PORTLET_ID
      },
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    )
      .then(response => response)
      .catch(async () => {
        const classNameId = await this.postFormData(
          '/api/jsonws/classname/fetch-class-name',
          {
            value: PORTLET_FILE_REPOSITORY
          },
          {
            headers: { Authorization: this._getAuthorizationHeader('basic') }
          }
        ).then(response => response.classNameId);

        return this.postFormData(
          '/api/jsonws/repository/add-repository',
          {
            groupId,
            classNameId: classNameId,
            parentFolderId: 0,
            name: FRAGMENTS_PORTLET_ID,
            description: '',
            portletId: FRAGMENTS_PORTLET_ID,
            typeSettingsProperties: JSON.stringify({})
          },
          {
            headers: { Authorization: this._getAuthorizationHeader('basic') }
          }
        ).then(response => response);
      });

    if (Number(previewFileEntryId) > 0) {
      fileEntry = this.postFormData(
        '/api/jsonws/dlapp/update-file-entry',
        {
          fileEntryId: previewFileEntryId,
          sourceFileName: filename,
          mimeType: mime.lookup(filename),
          title: filename,
          description: '',
          changeLog: '',
          dlVersionNumberIncrease: 'NONE',
          bytes
        },
        {
          headers: { Authorization: this._getAuthorizationHeader('basic') }
        }
      ).then(response => response);
    } else {
      fileEntry = this.postFormData(
        '/api/jsonws/dlapp/add-file-entry',
        {
          repositoryId: repository.repositoryId,
          folderId: repository.dlFolderId,
          sourceFileName: filename,
          mimeType: mime.lookup(filename),
          title: filename,
          description: '',
          changeLog: '',
          bytes
        },
        {
          headers: { Authorization: this._getAuthorizationHeader('basic') }
        }
      ).then(response => response.fileEntryId);
    }

    return fileEntry;
  },

  /**
   * @param {string} groupId
   * @param {string} fragmentCollectionId
   * @param {string} fragmentEntryKey
   * @param {{ status: number, name: string, type: number, html: string, css: string, js: string,  configuration: string, previewFileEntryId?: number}} data
   */
  addFragmentEntry(
    groupId,
    fragmentCollectionId,
    fragmentEntryKey,
    { status, name, type, html, css, js, configuration, previewFileEntryId = 0 }
  ) {
    return this.postFormData(
      '/api/jsonws/fragment.fragmententry/add-fragment-entry',
      {
        fragmentCollectionId,
        fragmentEntryKey,
        groupId,
        status,
        name,
        type,
        html,
        css,
        js,
        configuration: configuration,
        previewFileEntryId
      },
      {
        headers: { Authorization: this._getAuthorizationHeader('basic') }
      }
    );
  },

  /**
   * @param {string} basePath
   * @param {string} groupId
   */
  async importZip(basePath, groupId) {
    await this.refreshOAuthToken();

    const formData = new FormData();

    formData.append(
      'file',
      fs.createReadStream(
        path.resolve(basePath, 'build', 'liferay-fragments.zip')
      )
    );

    formData.append('groupId', groupId);

    const params = parseUrl(
      `${this._host}/c/portal/fragment/import_fragment_entries`
    );

    const options = Object.assign(
      {},
      {
        host: params.hostname,
        path: params.pathname,
        port: params.port,
        protocol: params.protocol
      },
      {
        headers: { Authorization: this._getAuthorizationHeader('oauth') },
        method: 'POST'
      }
    );

    return new Promise(function(resolve, reject) {
      formData.submit(options, function(error, response) {
        if (error) {
          reject(error);
        } else if (
          !response.statusCode ||
          response.statusCode < 200 ||
          response.statusCode >= 300
        ) {
          reject(new Error('statusCode=' + response.statusCode));
        } else {
          /** @type {any[]} */
          let body = [];

          response.on('data', function(chunk) {
            body.push(chunk);
          });

          response.on('end', function() {
            try {
              body = JSON.parse(Buffer.concat(body).toString());
            } catch (e) {
              reject(e);
              return;
            }

            resolve(body);
          });
        }
      });
    });
  },

  /**
   * @param {string} groupId
   * @param {string} html
   * @param {string} css
   * @param {string} js
   * @param {string} configuration
   */
  // eslint-disable-next-line max-params
  async renderFragmentPreview(groupId, html, css, js, configuration) {
    await this.refreshOAuthToken();

    return this.postFormData(
      '/c/portal/fragment/render_fragment_entry',
      {
        groupId,
        html,
        css,
        js,
        configuration
      },
      {
        headers: { Authorization: this._getAuthorizationHeader('oauth') }
      }
    );
  }
};

module.exports = api;
