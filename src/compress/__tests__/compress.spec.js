const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const tmp = require('tmp');

const getTestFixtures = require('../../utils/get-test-fixtures');
import { buildProjectContent } from '../../utils/project-content/build-project-content';
const {
  default: getProjectContent,
} = require('../../utils/project-content/get-project-content');
const { default: compress } = require('../compress');

describe('compress', () => {
  test.each(
    getTestFixtures().map((fixturePath) => [
      path.basename(fixturePath),
      fixturePath,
    ])
  )('generates a zip for %p', async (_, fixturePath) => {
    const projectContent = getProjectContent(fixturePath);
    const compressedProjectContent = await getCompressedProject(projectContent);

    removeProjectIgnoredProps(projectContent);
    removeProjectIgnoredProps(compressedProjectContent);

    expect(compressedProjectContent).toEqual(projectContent);
  });

  test.each(
    getTestFixtures().map((fixturePath) => [
      path.basename(fixturePath),
      fixturePath,
    ])
  )(
    'generates a zip for built project %p',
    async (_, fixturePath) => {
      const builtProjectContent = await buildProjectContent(
        getProjectContent(fixturePath)
      );

      const compressedProjectContent = await getCompressedProject(
        builtProjectContent
      );

      removeProjectIgnoredProps(builtProjectContent);
      removeProjectIgnoredProps(compressedProjectContent);

      expect(compressedProjectContent).toEqual(builtProjectContent);
    },
    60000
  );
});

async function getCompressedProject(projectContent) {
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

  return compressedProjectContent;
}

function removeProjectIgnoredProps(projectContent) {
  delete projectContent.basePath;
  delete projectContent.unknownFiles;

  projectContent.collections.forEach((collection) => {
    collection.fragments.forEach((fragment) => {
      delete fragment.unknownFiles;
    });
  });
}
