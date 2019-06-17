const api = require('../../utils/api');
const { logData } = require('../../utils/log');

/**
 * Exports existing collections from Liferay server to the current project
 * @param {string} groupId Group ID
 * @param {Object} project
 */
async function exportCollections(groupId, project) {
  logData('\nExporting collections to', project.project.name);
  const collections = await api.getFragmentCollections(groupId);

  return Promise.all(
    collections.map(collection => _exportCollection(groupId, collection))
  );
}

/**
 * Exports a collection from server
 * @param {string} groupId
 * @param {{ name: string, fragmentCollectionId: string, fragmentCollectionKey: string, description: string }} collection
 */
async function _exportCollection(groupId, collection) {
  logData('Exporting collection', collection.name);

  const fragments = await api.getFragmentEntries(
    groupId,
    collection.fragmentCollectionId
  );

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
