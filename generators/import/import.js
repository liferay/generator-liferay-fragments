const api = require('../../utils/api');
const { log, LOG_LEVEL } = require('../../utils/log');
const getProjectContent = require('../../utils/get-project-content');
const compress = require('../compress/compress');
const {
  ADD_DEPLOYMENT_DESCRIPTOR_VAR,
  FRAGMENT_IMPORT_STATUS,
  PAGE_TEMPLATE_IMPORT_STATUS
} = require('../../utils/constants');
const path = require('path');

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
 * @param {string} projectPath Project absolute path
 */
async function importProject(groupId, projectPath) {
  log('Importing project...', { newLine: true });

  // Try to import using Struts action first
  try {
    const zip = await compress(projectPath, {
      [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: false
    });

    if (Object.keys(zip.files).length) {
      const response = await api.importZip(projectPath, groupId);

      if (response.error) {
        throw new Error('Zip import error');
      }

      if (
        (response.fragmentEntriesImportResult &&
          response.fragmentEntriesImportResult.length > 0) ||
        (response.pageTemplatesImportResult &&
          response.pageTemplatesImportResult.length > 0)
      ) {
        _logImportResults(
          response.fragmentEntriesImportResult || [],
          response.pageTemplatesImportResult || []
        );
      } else {
        log('Project imported', { level: 'LOG_LEVEL_SUCCESS' });
      }
    } else {
      throw new Error('zip file not generated');
    }
  } catch (error) {
    log('Zip file not generated, using legacy APIs', {
      level: 'LOG_LEVEL_ERROR'
    });
    await importProject.legacy(groupId, projectPath);
  }
}

/**
 * Imports current project to Liferay server
 * @deprecated
 * @param {string} groupId Group ID
 * @param {string} projectPath Project absolute path
 */
importProject.legacy = async function(groupId, projectPath) {
  const project = getProjectContent(projectPath);

  /** @type {Array<import('../../types/index').ICollectionRequest>} */
  let collectionRequests = [];
  /** @type {Array<import('../../types/index').IFragmentRequest>} */
  let fragmentRequests = [];

  collectionRequests = project.collections.map(collection => {
    /** @type {import('../../types/index').ICollectionRequest} */
    const collectionRequest = {
      collection,
      existingCollection: undefined,
      error: undefined,
      status: 'pending',
      promise: undefined
    };

    collectionRequest.promise = _importCollection(groupId, collection)
      .then(existingCollection => {
        collectionRequest.existingCollection = existingCollection;
        collectionRequest.status = 'success';
      })
      .catch(error => {
        collectionRequest.error = error;
        collectionRequest.status = 'error';
      });

    return collectionRequest;
  });

  await Promise.all(
    collectionRequests.map(collectionRequest => collectionRequest.promise)
  );

  fragmentRequests = collectionRequests
    .map(collectionRequest =>
      collectionRequest.collection.fragments.map(fragment => {
        /** @type {import('../../types/index').IFragmentRequest} */
        const fragmentRequest = {
          collection: collectionRequest.collection,
          fragment,
          existingFragment: undefined,
          promise: undefined,
          error: undefined,
          status: 'pending'
        };

        if (
          collectionRequest.status === 'success' &&
          collectionRequest.existingCollection
        ) {
          fragmentRequest.promise = _importFragment(
            groupId,
            collectionRequest.existingCollection,
            fragment,
            projectPath
          )
            .then(([status, existingFragment]) => {
              fragmentRequest.status = status;
              fragmentRequest.existingFragment = existingFragment;
            })
            .catch(error => {
              fragmentRequest.status = 'error';
              fragmentRequest.error = error;
            });
        } else {
          fragmentRequest.promise = Promise.resolve();
          fragmentRequest.status = 'ignored';
        }

        return fragmentRequest;
      })
    )
    .reduce((a, b) => [...a, ...b], []);

  await Promise.all(
    fragmentRequests.map(fragmentRequest => fragmentRequest.promise)
  );

  _logImportSummary(collectionRequests, fragmentRequests);
  _logImportErrorsLegacy(collectionRequests, fragmentRequests);
};

/**
 * @param {Array<import('../../types/index').ICollectionRequest>} collectionRequests
 * @param {Array<import('../../types/index').IFragmentRequest>} fragmentRequests
 */
function _logImportSummary(collectionRequests, fragmentRequests) {
  const addedCount = fragmentRequests.filter(
    fragmentRequest => fragmentRequest.status === 'added'
  ).length;

  const updatedCount = fragmentRequests.filter(
    fragmentRequest => fragmentRequest.status === 'updated'
  ).length;

  const upToDateCount = fragmentRequests.filter(
    fragmentRequest => fragmentRequest.status === 'upToDate'
  ).length;

  const ignoredCount = fragmentRequests.filter(
    fragmentRequest => fragmentRequest.status === 'ignored'
  ).length;

  const errorCount = fragmentRequests.filter(
    fragmentRequest => fragmentRequest.status === 'error'
  ).length;

  /**
   * @param {number} count
   * @param {string} message
   * @param {'LOG_LEVEL_ERROR'|'LOG_LEVEL_SUCCESS'} [level='LOG_LEVEL_SUCCESS']
   */
  const statusLog = (count, message, level = 'LOG_LEVEL_SUCCESS') => {
    let noun = fragmentRequests.length === 1 ? 'fragment' : 'fragments';
    let verb = count === 1 ? 'was' : 'were';

    if (count > 0) {
      log(
        `${count} of ${fragmentRequests.length} ${noun} ${verb} ${message}.`,
        { level }
      );
    }
  };

  log('');
  statusLog(addedCount, 'added successfully');
  statusLog(updatedCount, 'updated successfully');
  statusLog(upToDateCount, 'already up to date');
  statusLog(
    ignoredCount + errorCount,
    'not imported due to errors',
    'LOG_LEVEL_ERROR'
  );
}

/**
 * @param {{name: string, errorMessage: string, status: string}[]} fragmentEntriesImportResult
 * @param {{name: string, errorMessage: string, status: string}[]} pageTemplatesImportResult
 */
function _logImportResults(
  fragmentEntriesImportResult,
  pageTemplatesImportResult
) {
  fragmentEntriesImportResult.forEach(result => {
    switch (result.status) {
      case FRAGMENT_IMPORT_STATUS.IMPORTED: {
        log(`✔ Fragment ${result.name} imported`, { level: LOG_LEVEL.success });

        break;
      }

      case FRAGMENT_IMPORT_STATUS.IMPORTED_DRAFT: {
        log(
          `↷ Fragment ${result.name} imported as draft due to the following errors`,
          {
            level: LOG_LEVEL.info
          }
        );

        log(`ERROR: ${result.errorMessage}`, {
          level: LOG_LEVEL.error
        });

        break;
      }

      case FRAGMENT_IMPORT_STATUS.INVALID: {
        log(
          `Fragment ${result.name} not imported due to the following errors`,
          {
            level: LOG_LEVEL.error
          }
        );

        log(`ERROR: ${result.errorMessage}`, {
          level: LOG_LEVEL.error
        });

        break;
      }

      default:
        break;
    }
  });

  pageTemplatesImportResult.forEach(result => {
    switch (result.status) {
      case PAGE_TEMPLATE_IMPORT_STATUS.IMPORTED: {
        log(`✔ Page template ${result.name} imported`, {
          level: LOG_LEVEL.success
        });

        break;
      }

      case PAGE_TEMPLATE_IMPORT_STATUS.IGNORED: {
        log(`↷ Page template ${result.name} ignored`, {
          level: LOG_LEVEL.info
        });

        break;
      }

      case PAGE_TEMPLATE_IMPORT_STATUS.INVALID: {
        log(
          `Page template ${result.name} not imported due to the following errors`,
          {
            level: LOG_LEVEL.error
          }
        );

        log(`ERROR: ${result.errorMessage}`, {
          level: LOG_LEVEL.error
        });

        break;
      }

      default:
        break;
    }
  });
}

/**
 * @param {Array<import('../../types/index').ICollectionRequest>} collectionRequests
 * @param {Array<import('../../types/index').IFragmentRequest>} fragmentRequests
 */
function _logImportErrorsLegacy(collectionRequests, fragmentRequests) {
  const sortedFragmentRequests = [...fragmentRequests].sort((a, b) => {
    if (a.collection.slug < b.collection.slug) {
      return -1;
    }

    if (a.collection.slug > b.collection.slug) {
      return 1;
    }

    if (a.fragment.slug < b.fragment.slug) {
      return -1;
    }

    if (a.fragment.slug > b.fragment.slug) {
      return 1;
    }

    return 0;
  });

  collectionRequests.forEach(collectionRequest => {
    const name =
      collectionRequest.collection.metadata.name ||
      collectionRequest.collection.slug;

    log('');
    if (collectionRequest.status === 'success') {
      log(`✔ Collection ${name}`, { level: LOG_LEVEL.success });
    } else {
      log(`✘ Collection ${name} was not imported`, { level: LOG_LEVEL.error });

      if (collectionRequest.error) {
        log(collectionRequest.error.message);
      }
    }

    sortedFragmentRequests
      .filter(
        fragmentRequest =>
          fragmentRequest.collection.slug === collectionRequest.collection.slug
      )
      .forEach(fragmentRequest => {
        if (fragmentRequest.status === 'error') {
          log(
            `✘ Fragment ${fragmentRequest.fragment.metadata.name ||
              fragmentRequest.fragment
                .slug} was not imported due to fragment errors`,
            { level: LOG_LEVEL.error, indent: true }
          );

          if (fragmentRequest.error) {
            log(fragmentRequest.error.message, { indent: true });
          }
        } else if (fragmentRequest.status === 'ignored') {
          log(
            `↷ Fragment ${fragmentRequest.fragment.metadata.name} was not imported due to collection errors`,
            {
              level: LOG_LEVEL.error,
              indent: true
            }
          );
        } else if (fragmentRequest.status === 'added') {
          log(`✚ Fragment ${fragmentRequest.fragment.metadata.name} added`, {
            level: LOG_LEVEL.success,
            indent: true
          });
        } else if (fragmentRequest.status === 'updated') {
          log(`✎ Fragment ${fragmentRequest.fragment.metadata.name} updated`, {
            level: LOG_LEVEL.success,
            indent: true
          });
        } else {
          log(
            `✔ Fragment ${fragmentRequest.fragment.metadata.name} up-to-date`,
            {
              level: LOG_LEVEL.success,
              indent: true
            }
          );
        }
      });
  });
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
    fragment.configuration !== existingFragment.configuration ||
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
 * @return {Promise<import('../../types/index').IServerCollection | undefined>}
 */
async function _importCollection(groupId, collection) {
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

  return existingCollection;
}

/**
 * Imports a given fragment to Liferay server
 * @param {string} groupId Group ID
 * @param {import('../../types/index').IServerCollection} existingCollection
 * @param {import('../../types/index').IFragment} fragment
 * @param {string} projectPath Project absolute path
 * @return {Promise<[import('../../types/index').IFragmentRequestStatus, import('../../types/index').IServerFragment | undefined]>}
 */
async function _importFragment(
  groupId,
  existingCollection,
  fragment,
  projectPath
) {
  const { fragmentCollectionId } = existingCollection;
  const { css, html, js, configuration } = fragment;
  const { name } = fragment.metadata;
  const type = _getFragmentTypeId(fragment.metadata.type);
  const fragmentEntryKey = fragment.slug;
  const status = 0;
  let previewFileEntryId = 0;

  try {
    let existingFragment = await _getExistingFragment(
      groupId,
      existingCollection,
      fragment
    );

    if (fragment.metadata.thumbnailPath) {
      previewFileEntryId = await api.uploadThumbnail(
        groupId,
        fragmentEntryKey,
        path.join(
          projectPath,
          'src',
          existingCollection.fragmentCollectionKey,
          fragment.slug,
          fragment.metadata.thumbnailPath
        ),
        existingFragment ? existingFragment.previewFileEntryId : '0'
      );
    }

    if (existingFragment && _fragmentHasChanges(existingFragment, fragment)) {
      await api.updateFragmentEntry(existingFragment.fragmentEntryId, {
        status,
        name,
        html,
        css,
        js,
        configuration,
        previewFileEntryId
      });

      return ['updated', existingFragment];
    }

    if (existingFragment) {
      return ['upToDate', existingFragment];
    }

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
        js,
        configuration,
        previewFileEntryId
      }
    );

    return ['added', existingFragment];
  } catch (error) {
    throw error;
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
