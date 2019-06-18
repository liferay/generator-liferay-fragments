const getProjectContent = require('../get-project-content');
const tmp = require('tmp');
const getTestFixtures = require('../get-test-fixtures');
const writeProjectContent = require('../write-project-content');

describe('utils/write-project-content', () => {
  getTestFixtures().forEach(projectPath => {
    it('writes a project inside a given path', async () => {
      const tmpDir = tmp.dirSync({ unsafeCleanup: true });
      const projectContent = getProjectContent(projectPath);

      await writeProjectContent(tmpDir.name, projectContent);

      const newProjectContent = getProjectContent(tmpDir.name);
      tmpDir.removeCallback();

      expect(projectContent.collections).toEqual(newProjectContent.collections);
    });
  });
});
