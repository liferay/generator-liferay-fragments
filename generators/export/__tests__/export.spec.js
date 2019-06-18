const api = require('../../../utils/api');
const getProjectContent = require('../../../utils/get-project-content');
const getTestFixtures = require('../../../utils/get-test-fixtures');
const exportCollections = require('../export');

/**
 * @type string
 */
const GROUP_ID = '1234';

describe('export-generator/export', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  getTestFixtures().forEach(projectPath => {
    it('exports fragments from a Liferay Site', async () => {
      const projectContent = getProjectContent(projectPath);

      jest.spyOn(api, 'getFragmentCollections').mockImplementation(async () => [
        {
          fragmentCollectionId: 'collection-a',
          fragmentCollectionKey: 'collection-a',
          name: 'Collection A',
          description: 'This is collection A'
        },
        {
          fragmentCollectionId: 'collection-b',
          fragmentCollectionKey: 'collection-b',
          name: 'Collection B',
          description: 'This is collection B'
        }
      ]);

      jest
        .spyOn(api, 'getFragmentEntries')
        .mockImplementation(async (groupId, fragmentCollectionId) => [
          {
            fragmentEntryKey: `${groupId}-${fragmentCollectionId}-fragment-a`,
            fragmentEntryId: `${groupId}-${fragmentCollectionId}-fragment-a`,
            type: '1',
            name: 'Fragment A',
            html: '<fragment-a></fragment-a>',
            css: '.fragment {}',
            js: 'console.log("fragment")'
          }
        ]);

      expect(
        await exportCollections(GROUP_ID, projectContent)
      ).toMatchSnapshot();
    });
  });
});
