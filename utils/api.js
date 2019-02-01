const util = require('util');
const request = require('request');

/**
 * Sends a HTTP request to liferay host api url
 * @param {object} options request options
 * @param {string} options.url request options
 * @return {Promise<Response>} Request response
 */
const api = async options => {
  const promiseRequest = util.promisify(request);
  const response = await promiseRequest(options);

  return api.parseResponse(response);
};

/**
 * @param {object} response API response
 * @param {number} response.status Response status
 * @param {string} response.body Response body
 * @return {object} Response
 */
api.parseResponse = response => {
  if (response.status >= 400) {
    throw response;
  } else {
    let responseBody = {};

    try {
      responseBody = JSON.parse(response.body);
    } catch (error) {}

    if (responseBody.exception) {
      throw new Error(responseBody.exception);
    }

    if (responseBody.error) {
      throw new Error(responseBody.error);
    }

    return responseBody;
  }
};

/**
 * Returns a wrapped api
 * @param {string} host Liferay host
 * @param {string} auth Basic auth string
 * @return {Function} Wrapped api
 */
api.wrap = (host, auth) =>
  /**
   * Performs a wrapped API call and returns the result
   * @param {string} path API method path
   * @param {Object} [body=undefined] Request body
   * @param {Object} [options={ method: 'GET' }] Request options
   * @param {string} [options.method='GET'] HTTP method
   * @return {Promise} Request result promise
   */
  (path, body = undefined, options = { method: 'GET' }) => {
    const method = options ? options.method || 'GET' : 'GET';

    return api(
      Object.assign(
        {
          url: `${host}/api/jsonws${path}`,
          headers: { Authorization: `Basic ${auth}` },
          formData: body
        },
        Object.assign({}, options, { method })
      )
    );
  };

module.exports = api;
