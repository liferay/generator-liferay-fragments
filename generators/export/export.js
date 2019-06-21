const api = require('../../utils/api');
const { logData } = require('../../utils/log');

/**
 * Exports existing collections from Liferay server to the current project
 * @param {string} groupId Group ID
 * @param {import('../../types/index').IProject} project
 * @return {Promise<import('../../types').ICollection[]>}
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
 * @param {import('../../types/index').IServerCollection} collection
 * @return {Promise<import('../../types/index').ICollection>}
 */
async function _exportCollection(groupId, collection) {
  logData('Exporting collection', collection.name);

  const fragments = await api.getFragmentEntries(
    groupId,
    collection.fragmentCollectionId
  );

  return {
    slug: collection.fragmentCollectionKey,
    fragmentCollectionId: collection.fragmentCollectionId,
    metadata: {
      name: collection.name,
      description: collection.description
    },
    fragments: fragments.map(fragment => ({
      slug: fragment.fragmentEntryKey,
      metadata: {
        type: fragment.type,
        name: fragment.name,
        cssPath: 'styles.css',
        htmlPath: 'index.html',
        jsPath: 'main.js',
        configPath: 'config.json'
      },
      css: fragment.css,
      html: fragment.html,
      js: fragment.js,
      config: fragment.config
    }))
  };
}

module.exports = exportCollections;
