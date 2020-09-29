const getTestFixtures = require('../get-test-fixtures');
const {
  default: getProjectContent,
} = require('../project-content/get-project-content');

describe('utils/get-project-content', () => {
  it('requires a valid package.json file', () => {
    expect(() => getProjectContent(Math.random().toString())).toThrow();
  });

  getTestFixtures().forEach((projectPath) => {
    it('matches a project structure', () => {
      const projectContent = getProjectContent(projectPath);

      expect(projectContent).toEqual(
        expect.objectContaining({
          basePath: projectPath,

          project: expect.objectContaining({
            name: expect.any(String),
          }),

          collections: expect.arrayContaining([
            expect.objectContaining({
              slug: expect.any(String),
              fragmentCollectionId: expect.any(String),

              metadata: expect.objectContaining({
                name: expect.any(String),
                description: expect.any(String),
              }),

              fragments: expect.arrayContaining([
                expect.objectContaining({
                  slug: expect.any(String),
                  html: expect.any(String),
                  js: expect.any(String),
                  css: expect.any(String),

                  metadata: expect.objectContaining({
                    htmlPath: expect.any(String),
                    jsPath: expect.any(String),
                    cssPath: expect.any(String),
                    name: expect.any(String),
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });
  });
});
