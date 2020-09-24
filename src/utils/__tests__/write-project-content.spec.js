const fs = require('fs');
const path = require('path');
const tmp = require('tmp');

const { default: getProjectContent } = require('../get-project-content');
const writeProjectContent = require('../write-project-content');

describe('utils/write-project-content', () => {
  const projectCollections = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'assets', 'project-collection.json'),
      'utf-8'
    )
  );

  it('writes a project inside a given path', async () => {
    const projectContent = {
      basePath: __dirname,
      project: {
        name: 'sample-project',
      },
      collections: projectCollections,
    };

    const tmpDir = tmp.dirSync({ unsafeCleanup: true });

    await writeProjectContent(tmpDir.name, projectContent);

    const newProjectContent = getProjectContent(tmpDir.name);
    tmpDir.removeCallback();

    expect(projectContent.collections).toEqual(newProjectContent.collections);
  });
});
