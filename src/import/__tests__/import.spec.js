const JSZip = require('jszip');

const compress = require('../../compress/compress');
const api = require('../../utils/api');
const { ADD_DEPLOYMENT_DESCRIPTOR_VAR } = require('../../utils/constants');
const getTestFixtures = require('../../utils/get-test-fixtures');
const importProject = require('../import');

jest.mock('../../compress/compress');
jest.mock('../../../utils/api');

const GROUP_ID = '1234';

[getTestFixtures()[0]].forEach((projectPath) => {
  describe(`import ${projectPath}`, () => {
    const legacyMock = jest.spyOn(importProject, 'legacy');
    const zip = new JSZip();
    zip.file('sample.txt', 'sample');

    afterEach(() => {
      api.importZip.mockReset();
      compress.mockReset();
      legacyMock.mockReset();
    });

    beforeEach(() => {
      compress.mockImplementation(() => Promise.resolve(zip));
      api.importZip.mockImplementation(() => Promise.resolve({}));
      legacyMock.mockImplementation(() => {});
    });

    it('tries to generate a zip file from the given project', async () => {
      await importProject(GROUP_ID, projectPath);

      expect(compress).toHaveBeenCalledWith(projectPath, {
        [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: false,
      });
    });

    it('sends the given zip to backend', async () => {
      await importProject(GROUP_ID, projectPath);
      expect(api.importZip).toHaveBeenCalledWith(projectPath, GROUP_ID);
    });

    it('does not call legacy APIs if not necesary', async () => {
      await importProject(GROUP_ID, projectPath);
      expect(legacyMock).not.toHaveBeenCalled();
    });

    it('imports the project using old APIs if compress error', async () => {
      compress.mockImplementation(() => {
        throw new Error('error');
      });

      await importProject(GROUP_ID, projectPath);
      expect(legacyMock).toHaveBeenCalled();
    });

    it('imports the project using old APIs if api error', async () => {
      api.importZip.mockImplementation(() => {
        throw new Error('error');
      });

      await importProject(GROUP_ID, projectPath);
      expect(legacyMock).toHaveBeenCalled();
    });

    test.todo('[DEPRECATED] creates every collection in local project');

    test.todo('[DEPRECATED] updates existing collections');

    test.todo('[DEPRECATED] imports every fragment in local project');

    test.todo('[DEPRECATED] updates existing fragments');
  });
});
