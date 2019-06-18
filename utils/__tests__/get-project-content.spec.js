const getProjectContent = require('../get-project-content');
const getTestFixtures = require('../get-test-fixtures');

describe('utils/get-project-content', () => {
  it('requires a valid package.json file', () => {
    expect(() => getProjectContent(Math.random().toString())).toThrow();
  });

  getTestFixtures().forEach(projectPath => {
    it('matches a project structure', () => {
      const projectContent = getProjectContent(projectPath);

      projectContent.basePath = '';
      expect(projectContent).toMatchSnapshot();
    });
  });
});
