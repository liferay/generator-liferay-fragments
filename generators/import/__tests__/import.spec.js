const getSiteApi = require('./get-site-api');
const importProject = require('../import');
const getProjectContent = require('../../../utils/get-project-content');
const path = require('path');

describe('import-generator/import', () => {
  let groupId;
  let projectContent;

  beforeEach(() => {
    groupId = '1234';

    projectContent = getProjectContent(
      path.resolve(__dirname, 'assets', 'sample-project-content')
    );
  });

  it('imports fragments to a Liferay Site', async () => {
    const siteApi = getSiteApi({ collections: [] });

    await importProject(siteApi, groupId, projectContent);
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

    await importProject(siteApi, groupId, projectContent);
    expect(siteApi.getProject()).toMatchSnapshot();
  });
});
