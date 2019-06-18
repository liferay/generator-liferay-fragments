const api = require('../../utils/api');
const { logData, logNewLine } = require('../../utils/log');

/**
 * Fragment types
 * @type {object}
 */
const FRAGMENT_TYPES = {
  component: 1,
  section: 0
};

/**
 * Default fragment type
 * @type {number}
 */
const DEFAULT_FRAGMENT_TYPE = FRAGMENT_TYPES.section;

/**
 * Imports current project to Liferay server
 * @param {string} groupId Group ID
 * @param {import('../../types/index').IProject} project
 */
async function importProject(groupId, project) {
  logData('\nImporting project', project.project.name);

  await Promise.all(
    project.collections.map(async collection => {
      await _importCollection(groupId, collection);
    })
  );

  logNewLine('Project sent successfully');
}

/**
 * Checks if the given existingFragment is outdated comparing
 * with the given fragment.
 * @param {import('../../types/index').IServerFragment} existingFragment Server fragment
 * @param {import('../../types/index').IFragment} fragment Local fragment
 * @return {boolean} True if it has any new change
 */
function _fragmentHasChanges(existingFragment, fragment) {
  return (
    fragment.css !== existingFragment.css ||
    fragment.html !== existingFragment.html ||
    fragment.js !== existingFragment.js ||
    fragment.metadata.name !== existingFragment.name
  );
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
 * @param {string} groupId
 * @param {import('../../types/index').ICollection} collection
 */
async function _importCollection(groupId, collection) {
  logData('Importing collection', collection.metadata.name);

  const { name, description } = collection.metadata;
  const { slug } = collection;

  let existingCollection = await _getExistingCollection(groupId, collection);

  if (existingCollection) {
    const { fragmentCollectionId } = existingCollection;
    await api.updateFragmentCollection(fragmentCollectionId, name, description);
  } else {
    await api.addFragmentCollection(groupId, slug, name, description);
    existingCollection = await _getExistingCollection(groupId, collection);
  }

  if (existingCollection) {
    await Promise.all(
      collection.fragments.map(async fragment => {
        if (existingCollection) {
          await _importFragment(groupId, existingCollection, fragment);
        }
      })
    );
  }
}

/**
 * Imports a given fragment to Liferay server
 * @param {string} groupId Group ID
 * @param {import('../../types/index').IServerCollection} existingCollection
 * @param {import('../../types/index').IFragment} fragment
 */
async function _importFragment(groupId, existingCollection, fragment) {
  const { fragmentCollectionId } = existingCollection;
  const { css, html, js } = fragment;
  const { name } = fragment.metadata;
  const type = _getFragmentTypeId(fragment.metadata.type);
  const fragmentEntryKey = fragment.slug;
  const status = 0;

  let existingFragment = await _getExistingFragment(
    groupId,
    existingCollection,
    fragment
  );

  if (existingFragment && _fragmentHasChanges(existingFragment, fragment)) {
    await api.updateFragmentEntry(existingFragment.fragmentEntryId, {
      status,
      name,
      html,
      css,
      js
    });

    logData('Updated', fragment.metadata.name);
  } else if (existingFragment) {
    logData('Up-to-date', fragment.metadata.name);
  } else {
    existingFragment = await api.addFragmentEntry(
      groupId,
      fragmentCollectionId,
      fragmentEntryKey,
      {
        status,
        name,
        type,
        html,
        css,
        js
      }
    );

    logData('Added', fragment.metadata.name);
  }
}

/**
 * Gets an existing collection from server
 * @param {string} groupId Group ID
 * @param {import('../../types/index').ICollection} collection
 * @return {Promise<import('../../types/index').IServerCollection|undefined>}
 */
async function _getExistingCollection(groupId, collection) {
  const existingCollections = await api.getFragmentCollections(
    groupId,
    collection.metadata.name
  );

  return existingCollections.find(
    existingCollection => existingCollection.name === collection.metadata.name
  );
}

/**
 * Gets an existing fragment from server
 * @param {string} groupId Group ID
 * @param {import('../../types/index').IServerCollection} existingCollection
 * @param {import('../../types/index').IFragment} fragment
 */
async function _getExistingFragment(groupId, existingCollection, fragment) {
  const existingFragments = await api.getFragmentEntries(
    groupId,
    existingCollection.fragmentCollectionId,
    fragment.metadata.name
  );

  return existingFragments.find(
    existingFragment => existingFragment.name === fragment.metadata.name
  );
}

module.exports = importProject;
