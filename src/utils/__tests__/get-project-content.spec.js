const path = require('path');

const getTestFixtures = require('../get-test-fixtures');
const {
  default: getProjectContent,
} = require('../project-content/get-project-content');

describe('utils/get-project-content', () => {
  it('requires a valid package.json file', () => {
    expect(() => getProjectContent(Math.random().toString())).toThrow();
  });

  const table = getTestFixtures().map((projectPath) => [
    path.basename(projectPath),
    projectPath,
  ]);

  it.each(table)(
    'matches a project structure (%s)',
    (projectPathBasename, projectPath) => {
      const projectContent = getProjectContent(projectPath);

      expect(projectContent).toEqual(
        expect.objectContaining({
          basePath: projectPath,

          project: expect.objectContaining({
            name: expect.any(String),
          }),

          collections: expect.any(Array),
        })
      );

      for (const collection of projectContent.collections) {
        expect(collection).toEqual(
          expect.objectContaining({
            slug: expect.any(String),
            fragmentCollectionId: expect.any(String),

            metadata: expect.objectContaining({
              name: expect.any(String),
              description: expect.any(String),
            }),

            fragments: expect.any(Array),
            fragmentCompositions: expect.any(Array),
          })
        );

        for (const fragment of collection.fragments) {
          expect(fragment).toEqual(
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
            })
          );
        }

        for (const fragmentComposition of collection.fragmentCompositions) {
          expect(fragmentComposition).toEqual(
            expect.objectContaining({
              slug: expect.any(String),

              metadata: expect.objectContaining({
                fragmentCompositionDefinitionPath: expect.any(String),
                name: expect.any(String),
              }),

              definitionData: expect.any(String),
            })
          );
        }

        expect(
          collection.fragmentCompositions.length + collection.fragments.length
        ).toBeGreaterThanOrEqual(1);
      }
    }
  );
});
