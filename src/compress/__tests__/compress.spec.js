const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const tmp = require('tmp');

const getTestFixtures = require('../../utils/get-test-fixtures');
const {
  default: getProjectContent,
} = require('../../utils/project-content/get-project-content');
const { default: compress } = require('../compress');

describe('compress', () => {
  getTestFixtures().forEach((fixturePath) => {
    const projectContent = getProjectContent(fixturePath);

    it(`generates a zip for ${path.basename(fixturePath)}`, async () => {
      const zip = await compress(projectContent, {});
      const tmpDir = tmp.dirSync({ unsafeCleanup: true });
      const files = Object.entries(zip.files).filter(([, data]) => !data.dir);

      for (const [key, data] of files) {
        const filePath = path.resolve(tmpDir.name, key);
        const directoryPath = path.dirname(filePath);

        if (!fs.existsSync(directoryPath)) {
          mkdirp.sync(directoryPath, { recursive: true });
        }

        fs.writeFileSync(filePath, await data.async('nodebuffer'));
      }

      const compressedProjectContent = getProjectContent(tmpDir.name);
      tmpDir.removeCallback();

      delete compressedProjectContent.basePath;
      delete compressedProjectContent.unknownFiles;
      delete projectContent.basePath;
      delete projectContent.unknownFiles;

      compressedProjectContent.collections.forEach((collection) => {
        collection.fragments.forEach((fragment) => {
          delete fragment.unknownFiles;
        });
      });

      projectContent.collections.forEach((collection) => {
        collection.fragments.forEach((fragment) => {
          delete fragment.unknownFiles;
        });
      });

      expect(compressedProjectContent).toEqual(projectContent);
    });
  });
});
