import { ICollection, IProject, IServerCollection } from '../../types';
import api from '../utils/api';
import { log } from '../utils/log';

export default async function exportCollections(
  groupId: string,
  project: IProject
): Promise<ICollection[]> {
  log('Exporting collections to', {
    data: project.project.name,
    newLine: true,
  });

  const collections = await api.getFragmentCollections(groupId);

  return Promise.all(
    collections.map((collection) => _exportCollection(groupId, collection))
  );
}

async function _exportCollection(
  groupId: string,
  collection: IServerCollection
): Promise<ICollection> {
  log('Exporting collection', { data: collection.name });

  const fragments = await api.getFragmentEntries(
    groupId,
    collection.fragmentCollectionId
  );

  const fragmentCompositions = await api.getFragmentCompositions(
    groupId,
    collection.fragmentCollectionId
  );

  return {
    slug: collection.fragmentCollectionKey,
    fragmentCollectionId: collection.fragmentCollectionId,

    metadata: {
      name: collection.name,
      description: collection.description,
    },

    fragmentCompositions: fragmentCompositions.map((fragmentComposition) => ({
      slug: fragmentComposition.fragmentCompositionKey,
      metadata: {
        fragmentCompositionDefinitionPath: 'definition.json',
        name: fragmentComposition.name,
      },
      definitionData: fragmentComposition.data,
    })),

    fragments: fragments.map((fragment) => ({
      slug: fragment.fragmentEntryKey,
      metadata: {
        type: fragment.type,
        name: fragment.name,
        cssPath: 'styles.css',
        htmlPath: 'index.html',
        jsPath: 'main.js',
        configurationPath: 'configuration.json',
      },
      css: fragment.css,
      html: fragment.html,
      js: fragment.js,
      configuration: fragment.configuration,
      unknownFiles: [],
    })),
  };
}
