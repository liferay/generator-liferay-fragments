const fs = require('fs');
const path = require('path');

const getTestFixtures = require('../get-test-fixtures');
const {
  default: getProjectContent,
} = require('../project-content/get-project-content');
const {
  default: writeProjectContent,
} = require('../project-content/write-project-content');
const { createTemporaryDirectory } = require('../temporary');

describe('utils/write-project-content', () => {
  getTestFixtures().forEach((projectPath) => {
    it(`writes ${projectPath} inside a given path`, async () => {
      const projectContent = getProjectContent(projectPath);
      const tmpDir = createTemporaryDirectory();

      await writeProjectContent(tmpDir.name, projectContent);

      const newProjectContent = getProjectContent(tmpDir.name);
      tmpDir.removeCallback();

      delete projectContent.basePath;
      delete newProjectContent.basePath;

      expect(newProjectContent).toEqual(projectContent);
    });
  });
});
