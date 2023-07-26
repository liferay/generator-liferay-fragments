import path from 'path';

import { ICollection, IServerCollection } from '../../types';
import api from '../utils/api';

export default async function exportCollections(
  groupId: string
): Promise<ICollection[]> {
  const collections = await api.getFragmentCollections(groupId);

  return Promise.all(
    collections.map((collection) => _exportCollection(groupId, collection))
  );
}

async function _exportCollection(
  groupId: string,
  collection: IServerCollection
): Promise<ICollection> {
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
    resources: [],

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
      directoryPath: path.join('fragments', fragment.fragmentEntryKey),
      slug: fragment.fragmentEntryKey,
      metadata: {
        type: fragment.type,
        name: fragment.name,
        cssPath: 'styles.css',
        htmlPath: 'index.html',
        jsPath: 'main.js',
        configurationPath: 'configuration.json',
        cacheable: false,
        typeOptions: {},
      },
      css: fragment.css,
      html: fragment.html,
      js: fragment.js,
      configuration: fragment.configuration,
      unknownFiles: [],
    })),
  };
}
