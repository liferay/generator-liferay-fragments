const path = require('path');

const getTestFixtures = require('../../utils/get-test-fixtures');
const {
  default: getProjectContent,
} = require('../../utils/project-content/get-project-content');
const { default: compress } = require('../compress');

describe('compress', () => {
  getTestFixtures().forEach((fixturePath) => {
    const projectContent = getProjectContent(fixturePath);

    it(`generates a zip for ${path.basename(fixturePath)}`, () =>
      compress(projectContent, {}).then((zip) => {
        expect(Object.keys(zip.files).length).not.toBe(0);
      }));
  });
});
