const getProjectContent = require('../get-project-content');
const path = require('path');

const SAMPLE_PROJECT_PATH = path.resolve(
  __dirname,
  'assets',
  'sample-project-content'
);

describe('utils/get-project-content', () => {
  it('requires a basePath', () => {
    expect(() => getProjectContent()).toThrow();
  });

  it('requires a valid package.json file', () => {
    expect(() => getProjectContent('')).toThrow();
  });

  it('matches a project structure', () => {
    const projectContent = getProjectContent(SAMPLE_PROJECT_PATH);

    projectContent.basePath = '';
    expect(projectContent).toMatchSnapshot();
  });
});
