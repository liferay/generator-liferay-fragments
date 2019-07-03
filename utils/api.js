const util = require('util');
const request = require('request');

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
    if (response.statusCode >= 400) {
      throw new Error(
        `${response.statusCode} ${response.body.substr(0, 100)}...`
      );
    }

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
      if ('exception' in responseBody) {
        throw new Error(responseBody.exception);
      }

      if ('error' in responseBody) {
        throw new Error(responseBody.error);
      }
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
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
      }
    );

    await this.postFormData(
      '/api/jsonws/user/get-current-user',
      {},
      {
        headers: { Authorization: `Bearer ${this._oauthToken.accessToken}` }
      }
    );
  },

  /**
   * @return {Promise<import('../types/index').ICompany[]>}
   */
  getCompanies() {
    return this.postFormData(
      '/api/jsonws/company/get-companies',
      {},
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
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
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
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
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
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
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
      }
    );
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
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
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
          Authorization: `Basic ${this._basicAuthToken}`
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
          Authorization: `Basic ${this._basicAuthToken}`
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
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
      }
    );
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
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
      }
    );
  },

  /**
   * @param {string} groupId
   * @param {string} html
   * @param {string} css
   * @param {string} js
   * @param {string} configuration
   */
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
        headers: { Authorization: `Bearer ${this._oauthToken.accessToken}` }
      }
    );
  }
};

module.exports = api;
