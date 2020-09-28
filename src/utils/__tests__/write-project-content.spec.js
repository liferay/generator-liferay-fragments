const fs = require('fs');
const path = require('path');
const tmp = require('tmp');

const getTestFixtures = require('../get-test-fixtures');
const {
  default: getProjectContent,
} = require('../project-content/get-project-content');
const {
  default: writeProjectContent,
} = require('../project-content/write-project-content');

describe('utils/write-project-content', () => {
  const projectCollections = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'assets', 'project-collection.json'),
      'utf-8'
    )
  );

  getTestFixtures().forEach((projectPath) => {
    it(`writes ${projectPath} inside a given path`, async () => {
      const projectContent = getProjectContent(projectPath);
      const tmpDir = tmp.dirSync({ unsafeCleanup: true });

      await writeProjectContent(tmpDir.name, projectContent);

      const newProjectContent = getProjectContent(tmpDir.name);
      tmpDir.removeCallback();

      delete projectContent.basePath;
      delete newProjectContent.basePath;

      expect(newProjectContent).toEqual(projectContent);
    });
  });
});
