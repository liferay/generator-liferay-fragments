const util = require('util');
const request = require('request');

const api = {
  _host: '',
  _basicAuthToken: '',
  _oauthToken: '',

  /**
   * Initializes api
   * @param {string} host
   * @param {string} basicAuthToken
   * @param {string} oauthToken
   */
  init(host, basicAuthToken, oauthToken) {
    this._host = host;
    this._basicAuthToken = basicAuthToken;
    this._oauthToken = oauthToken;
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
   * @param {object} [formData={}]
   * @param {object} [options={}]
   * @return {Promise<object|string>}
   */
  postFormData(url, formData = {}, options = {}) {
    return this.request('POST', url, Object.assign({}, { formData }, options));
  },

  /**
   * @return {Promise<''>}
   */
  async getCurrentUser() {
    return this.postFormData(
      '/api/jsonws/user/get-current-user',
      {},
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
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
   * @param {{ status: number, name: string, html: string, css: string, js: string }} data
   */
  updateFragmentEntry(fragmentEntryId, { status, name, html, css, js }) {
    return this.postFormData(
      '/api/jsonws/fragment.fragmententry/update-fragment-entry',
      {
        fragmentEntryId,
        status,
        name,
        html,
        css,
        js
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
   * @param {{ status: number, name: string, type: number, html: string, css: string, js: string }} data
   */
  addFragmentEntry(
    groupId,
    fragmentCollectionId,
    fragmentEntryKey,
    { status, name, type, html, css, js }
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
        js
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
   */
  renderFragmentPreview(groupId, html, css, js) {
    return this.postFormData(
      '/api/jsonws/fragment.fragmententry/render-fragment-entry-preview',
      {
        groupId,
        html,
        css,
        js
      },
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` }
      }
    );
  }
};

module.exports = api;
