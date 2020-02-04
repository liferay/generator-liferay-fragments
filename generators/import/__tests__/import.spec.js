// @ts-nocheck

jest.mock('../../compress/compress');
jest.mock('../../../utils/api');

const api = require('../../../utils/api');
const compress = require('../../compress/compress');
const getTestFixtures = require('../../../utils/get-test-fixtures');
const { ADD_DEPLOYMENT_DESCRIPTOR_VAR } = require('../../../utils/constants');
const importProject = require('../import');
const JSZip = require('jszip');

const GROUP_ID = '1234';

getTestFixtures().forEach(projectPath => {
  describe(`import ${projectPath}`, () => {
    const zip = new JSZip();
    zip.file('sample.txt', 'sample');

    afterEach(() => {
      compress.mockReset();
      api.importZip.mockReset();
    });

    beforeEach(() => {
      compress.mockImplementation(() => Promise.resolve(zip));
      api.importZip.mockImplementation(() => Promise.resolve({}));
    });

    it('tries to generate a zip file from the given project', async () => {
      await importProject(GROUP_ID, projectPath);

      expect(compress).toHaveBeenCalledWith(projectPath, {
        [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: false
      });
    });

    it('sends the given zip to backend', async () => {
      await importProject(GROUP_ID, projectPath);
      expect(api.importZip).toHaveBeenCalledWith(projectPath, GROUP_ID);
    });

    it('imports the project using old APIs if compress error', async () => {
      compress.mockImplementation(() => {
        throw new Error('error');
      });

      const legacyMock = jest.spyOn(importProject, 'legacy');
      legacyMock.mockImplementation(() => {});

      await importProject(GROUP_ID, projectPath);
      expect(legacyMock).toHaveBeenCalled();
    });

    it('imports the project using old APIs if api error', async () => {
      api.importZip.mockImplementation(() => {
        throw new Error('error');
      });

      const legacyMock = jest.spyOn(importProject, 'legacy');
      legacyMock.mockImplementation(() => {});

      await importProject(GROUP_ID, projectPath);
      expect(legacyMock).toHaveBeenCalled();
    });

    test.todo('[DEPRECATED] creates every collection in local project');
    test.todo('[DEPRECATED] updates existing collections');
    test.todo('[DEPRECATED] imports every fragment in local project');
    test.todo('[DEPRECATED] updates existing fragments');
  });
});
