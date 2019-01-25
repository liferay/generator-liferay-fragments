const { logData, logNewLine } = require('../../utils/log');

/**
 * Fragment types
 * @type {object}
 */
const FRAGMENT_TYPES = {
  element: 1,
  section: 0
};

/**
 * Default fragment type
 * @type {number}
 */
const DEFAULT_FRAGMENT_TYPE = FRAGMENT_TYPES.section;

/**
 * Imports current project to Liferay server
 * @param {function} api Wrapped API with valid host and authorization
 * @param {string} groupId Group ID
 * @param {Object} project Local project description
 */
async function importProject(api, groupId, project) {
  logData('\nImporting project', project.project.name);

  await Promise.all(
    project.collections.map(async collection => {
      await _importCollection(api, groupId, collection);
    })
  );

  logNewLine('Project sent successfully');
}

/**
 * Checks if the given existingFragment is outdated comparing
 * with the given fragment.
 * @param {object} existingFragment Server fragment
 * @param {object} fragment Local fragment
 * @return {boolean} True if it has any new change
 */
function _fragmentHasChanges(existingFragment, fragment) {
  const hasChanges =
    fragment.css !== existingFragment.css ||
    fragment.html !== existingFragment.html ||
    fragment.js !== existingFragment.js ||
    fragment.metadata.name !== existingFragment.name;

  if (!hasChanges) {
    logData('Up-to-date', fragment.metadata.name);
  }

  return hasChanges;
}

/**
 * Return a type id for a given fragment type
 * @param {string} type Fragment type
 * @return {number} Type ID
 */
function _getFragmentTypeId(type) {
  let typeId = DEFAULT_FRAGMENT_TYPE;

  if (type in FRAGMENT_TYPES) {
    typeId = FRAGMENT_TYPES[type];
  }

  return typeId;
}

/**
 * Imports a collection to server
 * @param {function} api Wrapped API with valid host and authorization
 * @param {string} groupId Group ID
 * @param {Object} collection Collection
 */
async function _importCollection(api, groupId, collection) {
  logData('Importing collection', collection.metadata.name);

  const { name, description } = collection.metadata;
  const { slug } = collection;

  let existingCollection = await _getExistingCollection(
    api,
    groupId,
    collection
  );

  if (existingCollection) {
    const { fragmentCollectionId } = existingCollection;

    await api(
      '/fragment.fragmentcollection/update-fragment-collection',
      { fragmentCollectionId, description, name },
      { method: 'POST' }
    );
  } else {
    existingCollection = await api(
      '/fragment.fragmentcollection/add-fragment-collection',
      {
        fragmentCollectionKey: slug,
        description,
        groupId,
        name
      }
    );
  }

  await Promise.all(
    collection.fragments.map(async fragment => {
      await _importFragment(api, groupId, existingCollection, fragment);
    })
  );
}

/**
 * Imports a given fragment to Liferay server
 * @param {function} api Wrapped API with valid host and authorization
 * @param {string} groupId Group ID
 * @param {object} existingCollection Collection
 * @param {object} fragment Fragment
 */
async function _importFragment(api, groupId, existingCollection, fragment) {
  const { fragmentCollectionId } = existingCollection;
  const { css, html, js } = fragment;
  const { name } = fragment.metadata;
  const type = _getFragmentTypeId(fragment.metadata.type);
  const fragmentEntryKey = fragment.slug;
  const status = 0;

  let existingFragment = await _getExistingFragment(
    api,
    groupId,
    existingCollection,
    fragment
  );

  if (existingFragment && _fragmentHasChanges(existingFragment, fragment)) {
    await api('/fragment.fragmententry/update-fragment-entry', {
      fragmentEntryId: existingFragment.fragmentEntryId,
      status,
      name,
      html,
      css,
      js
    });

    logData('Updated', fragment.metadata.name);
  } else {
    existingFragment = await api('/fragment.fragmententry/add-fragment-entry', {
      fragmentCollectionId,
      fragmentEntryKey,
      groupId,
      status,
      name,
      type,
      html,
      css,
      js
    });

    logData('Added', fragment.metadata.name);
  }
}

/**
 * Gets an existing collection from server
 * @param {function} api Wrapped API with valid host and authorization
 * @param {string} groupId Group ID
 * @param {Object} collection Local collection
 */
async function _getExistingCollection(api, groupId, collection) {
  const existingCollections = await api(
    '/fragment.fragmentcollection/get-fragment-collections',
    {
      name: collection.metadata.name,
      groupId
    }
  );

  return existingCollections.find(
    existingCollection => existingCollection.name === collection.metadata.name
  );
}

/**
 * Gets an existing fragment from server
 * @param {function} api Wrapped API with valid host and authorization
 * @param {string} groupId Group ID
 * @param {Object} existingCollection Existing collection
 * @param {Object} fragment Local fragment
 */
async function _getExistingFragment(
  api,
  groupId,
  existingCollection,
  fragment
) {
  const existingFragments = await api(
    '/fragment.fragmententry/get-fragment-entries',
    {
      fragmentCollectionId: existingCollection.fragmentCollectionId,
      name: fragment.metadata.name,
      groupId
    }
  );

  return existingFragments.find(
    existingFragment => existingFragment.name === fragment.metadata.name
  );
}

module.exports = importProject;
