const { logData } = require('../../utils/log');

/**
 * Exports existing collections from Liferay server to the current project
 * @param {function} api Wrapped API with valid host and authorization
 * @param {string} groupId Group ID
 * @param {Object} project Project object
 */
async function exportCollections(api, groupId, project) {
  logData('\nExporting collections to', project.project.name);

  const collections = await api(
    '/fragment.fragmentcollection/get-fragment-collections',
    {
      start: -1,
      end: -1,
      groupId
    }
  );

  return Promise.all(
    collections.map(collection =>
      _exportCollection(api, groupId, collection, project.basePath)
    )
  );
}

/**
 * Exports a collection from server
 * @param {function} api Wrapped API with valid host and authorization
 * @param {string} groupId Group ID
 * @param {Object} collection Collection
 * @param {string} basePath Project directory
 */
async function _exportCollection(api, groupId, collection) {
  logData('Exporting collection', collection.name);

  const fragments = await api('/fragment.fragmententry/get-fragment-entries', {
    fragmentCollectionId: collection.fragmentCollectionId,
    status: 0,
    start: -1,
    end: -1,
    groupId
  });

  return {
    slug: collection.fragmentCollectionKey,
    metadata: {
      name: collection.name,
      description: collection.description
    },
    fragments: fragments.map(fragment => ({
      slug: fragment.fragmentEntryKey,
      metadata: {
        name: fragment.name,
        cssPath: 'styles.css',
        htmlPath: 'index.html',
        jsPath: 'main.js'
      },
      css: fragment.css,
      html: fragment.html,
      js: fragment.js
    }))
  };
}

module.exports = exportCollections;
