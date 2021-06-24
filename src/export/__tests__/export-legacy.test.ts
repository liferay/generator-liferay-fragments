import path from 'path';

import api from '../../utils/api';
import exportCollections from '../export-legacy';

describe('export-generator/export', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('exports fragments from a Liferay Site', async () => {
    jest.spyOn(api, 'getFragmentCollections').mockImplementation(async () => [
      {
        fragmentCollectionId: 'collection-a',
        fragmentCollectionKey: 'collection-a',
        name: 'Collection A',
        description: 'This is collection A',
      },
      {
        fragmentCollectionId: 'collection-b',
        fragmentCollectionKey: 'collection-b',
        name: 'Collection B',
        description: 'This is collection B',
      },
    ]);

    jest
      .spyOn(api, 'getFragmentEntries')
      .mockImplementation(async (groupId, fragmentCollectionId) => [
        {
          fragmentEntryKey: `${groupId}-${fragmentCollectionId}-fragment-a`,
          fragmentEntryId: `${groupId}-${fragmentCollectionId}-fragment-a`,
          configuration: '{"fieldSets": []}',
          type: 'component',
          name: 'Fragment A',
          html: '<fragment-a></fragment-a>',
          css: '.fragment {}',
          js: 'console.log("fragment")',
          previewFileEntryId: '0',
        },
      ]);

    expect(await exportCollections('1234')).toEqual([
      {
        fragmentCollectionId: 'collection-a',
        fragmentCompositions: [],
        fragments: [
          {
            configuration: '{"fieldSets": []}',
            css: '.fragment {}',
            directoryPath: path.join(
              'fragments',
              '1234-collection-a-fragment-a'
            ),
            html: '<fragment-a></fragment-a>',
            js: 'console.log("fragment")',
            metadata: {
              configurationPath: 'configuration.json',
              cssPath: 'styles.css',
              htmlPath: 'index.html',
              jsPath: 'main.js',
              name: 'Fragment A',
              type: 'component',
            },
            slug: '1234-collection-a-fragment-a',
            unknownFiles: [],
          },
        ],
        metadata: {
          description: 'This is collection A',
          name: 'Collection A',
        },
        resources: [],
        slug: 'collection-a',
      },
      {
        fragmentCollectionId: 'collection-b',
        fragmentCompositions: [],
        fragments: [
          {
            configuration: '{"fieldSets": []}',
            css: '.fragment {}',
            directoryPath: path.join(
              'fragments',
              '1234-collection-b-fragment-a'
            ),
            html: '<fragment-a></fragment-a>',
            js: 'console.log("fragment")',
            metadata: {
              configurationPath: 'configuration.json',
              cssPath: 'styles.css',
              htmlPath: 'index.html',
              jsPath: 'main.js',
              name: 'Fragment A',
              type: 'component',
            },
            slug: '1234-collection-b-fragment-a',
            unknownFiles: [],
          },
        ],
        metadata: {
          description: 'This is collection B',
          name: 'Collection B',
        },
        resources: [],
        slug: 'collection-b',
      },
    ]);
  });
});
