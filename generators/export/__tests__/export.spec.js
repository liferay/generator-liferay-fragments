const getSiteApi = require('../../../utils/get-site-api-mock');
const getProjectContent = require('../../../utils/get-project-content');
const getTestFixtures = require('../../../utils/get-test-fixtures');
const exportCollections = require('../export');

/**
 * @type string
 */
const GROUP_ID = '1234';

describe('export-generator/export', () => {
  getTestFixtures().forEach(projectPath => {
    it('exports fragments from a Liferay Site', async () => {
      const projectContent = getProjectContent(projectPath);
      const siteApi = getSiteApi(projectContent);

      const newProjectContent = await exportCollections(
        siteApi,
        GROUP_ID,
        projectContent
      );

      expect(newProjectContent).toMatchSnapshot();
    });
  });
});
