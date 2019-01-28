const api = require('../../../utils/api');

const ADD_COLLECTION_URL =
  '/fragment.fragmentcollection/add-fragment-collection';
const GET_COLLECTIONS_URL =
  '/fragment.fragmentcollection/get-fragment-collections';
const UPDATE_COLLECTION_URL =
  '/fragment.fragmentcollection/update-fragment-collection';

const ADD_FRAGMENT_URL = '/fragment.fragmententry/add-fragment-entry';
const GET_FRAGMENTS_URL = '/fragment.fragmententry/get-fragment-entries';
const UPDATE_FRAGMENT_URL = '/fragment.fragmententry/update-fragment-entry';

/**
 * Gets a mocked site api
 * @param {object} project Initial project state
 * @return {function} Mocked site API
 */
module.exports = project => {
  /**
   * Adds a new collection
   * @param {object} body Request body
   * @param {string} body.name Collection name
   * @return {object} New collection
   */
  const _addCollection = body => {
    const collection = project.collections.find(
      ({ name }) => name === body.name
    );

    if (collection) {
      return { error: 'Collection exits' };
    }

    const newCollection = Object.assign({}, body);

    newCollection.fragmentCollectionId = body.fragmentCollectionKey;
    newCollection.fragments = [];
    project.collections = [...project.collections, newCollection];

    return newCollection;
  };

  /**
   * Get collections filtered by collection name
   * @param {object} body Request body
   * @param {string} body.name Collection name
   * @return {object[]} Collections
   */
  const _getCollections = body =>
    project.collections.filter(({ name }) => name === body.name);

  /**
   * Get collection fragments
   * @param {object} body Request body
   * @param {string} body.name Collection name
   * @return {object[]} Fragments
   */
  const _getFragments = body => {
    const collection = project.collections.find(
      ({ fragmentCollectionId }) =>
        fragmentCollectionId === body.fragmentCollectionId
    );

    if (collection) {
      return collection.fragments;
    }

    return { error: `Collection "${body.fragmentCollectionId}" not found` };
  };

  /**
   * Adds a new fragment
   * @param {object} body Request body
   * @param {string} body.name Fragment name
   * @return {object} New fragment
   */
  const _addFragment = body => {
    const newFragment = Object.assign({}, body);
    const collection = project.collections.find(
      ({ fragmentCollectionId }) =>
        fragmentCollectionId === body.fragmentCollectionId
    );

    if (collection) {
      const fragment = collection.fragments.find(
        ({ name }) => name === newFragment.name
      );

      if (fragment) {
        return { error: `Fragment "${body.name}" exists` };
      }

      collection.fragments = [...collection.fragments, newFragment];
      return newFragment;
    }

    return { error: `Collection "${body.fragmentCollectionId}" not found` };
  };

  /**
   * Updates an existing collection
   * @param {object} body Request body
   * @return {object} Response body
   */
  const _updateCollection = body => {
    const collection = project.collections.find(
      ({ name }) => name === body.name
    );

    if (collection) {
      collection.name = body.name;
      collection.description = body.description;
      collection.fragmentCollectionId = body.fragmentCollectionId;

      return collection;
    }

    return { error: `Collection "${body.name}" not found` };
  };

  /**
   * Updates an existing collection
   * @param {object} body Request body
   * @return {object} Response body
   */
  const _updateFragment = body => {
    const fragment = []
      .concat(...project.collections.map(collection => collection.fragments))
      .find(({ name }) => name === body.name);

    if (fragment) {
      fragment.name = body.name;
      fragment.type = body.type;
      fragment.css = body.css;
      fragment.html = body.html;
      fragment.js = body.js;

      return fragment;
    }

    return { error: `Fragment "${body.name}" not found` };
  };

  /**
   * Mocks site API responses
   * @param {string} url Request url
   * @param {object} body Request body
   * @return {object} API response
   */
  const siteApi = async (url, body) => {
    expect({ url, body }).toMatchSnapshot();
    let responseBody;

    switch (url) {
      case ADD_COLLECTION_URL:
        responseBody = _addCollection(body);
        break;
      case GET_COLLECTIONS_URL:
        responseBody = _getCollections(body);
        break;
      case GET_FRAGMENTS_URL:
        responseBody = _getFragments(body);
        break;
      case ADD_FRAGMENT_URL:
        responseBody = _addFragment(body);
        break;
      case UPDATE_COLLECTION_URL:
        responseBody = _updateCollection(body);
        break;
      case UPDATE_FRAGMENT_URL:
        responseBody = _updateFragment(body);
        break;
      default:
        responseBody = { error: `URL ${url} not implemented` };
        break;
    }

    return api.parseResponse({
      body: JSON.stringify(responseBody),
      status: 200
    });
  };

  /**
   * Returns mocked site's project status
   * @return {object} Project status
   */
  siteApi.getProject = () => project;

  return siteApi;
};
