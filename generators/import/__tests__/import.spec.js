const getSiteApi = require('../../../utils/get-site-api-mock');
const getProjectContent = require('../../../utils/get-project-content');
const getTestFixtures = require('../../../utils/get-test-fixtures');
const importProject = require('../import');

/**
 * @type string
 */
const GROUP_ID = '1234';

describe('import-generator/import', () => {
  getTestFixtures()
    .map(projectPath => getProjectContent(projectPath))
    .forEach(projectContent => {
      it('imports fragments to a Liferay Site', async () => {
        const siteApi = getSiteApi({ collections: [] });

        await importProject(siteApi, GROUP_ID, projectContent);
        expect(siteApi.getProject()).toMatchSnapshot();
      });

      it('updates fragments if they already exist', async () => {
        const siteApi = getSiteApi({
          collections: [
            {
              name: 'Sample collection name',
              description: 'Sample collection description',
              fragmentCollectionId: 'sample-collection',

              fragments: [
                {
                  name: 'Sample fragment name',
                  fragmentCollectionId: 'sample-collection',
                  fragmentEntryId: 'sample-fragment'
                }
              ]
            }
          ]
        });

        await importProject(siteApi, GROUP_ID, projectContent);
        expect(siteApi.getProject()).toMatchSnapshot();
      });
    });
});
