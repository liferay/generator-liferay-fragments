const api = require('../../../utils/api');
const getProjectContent = require('../../../utils/get-project-content');
const getTestFixtures = require('../../../utils/get-test-fixtures');
const importProject = require('../import');

/**
 * @type string
 */
const GROUP_ID = '1234';

describe('import-generator/import', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest
      .spyOn(api, 'addFragmentCollection')
      .mockImplementation(async (...args) => {
        expect(args).toMatchSnapshot('addFragmentCollection');
        return '';
      });

    jest
      .spyOn(api, 'updateFragmentCollection')
      .mockImplementation(async (...args) => {
        expect(args).toMatchSnapshot('updateFragmentCollection');
        return '';
      });

    jest.spyOn(api, 'addFragmentEntry').mockImplementation(async (...args) => {
      expect(args).toMatchSnapshot('addFragmentEntry');
      return '';
    });

    jest
      .spyOn(api, 'updateFragmentEntry')
      .mockImplementation(async (...args) => {
        expect(args).toMatchSnapshot('updateFragmentEntry');
        return '';
      });
  });

  getTestFixtures()
    .map(projectPath => getProjectContent(projectPath))
    .forEach(projectContent => {
      const apiCollections = projectContent.collections.map(collection => ({
        name: collection.metadata.name,
        fragmentCollectionId: collection.slug,
        fragmentCollectionKey: collection.slug,
        description: collection.metadata.description
      }));

      const apiFragments = projectContent.collections
        .map(collection =>
          collection.fragments.map(fragment => ({
            name: fragment.metadata.name,
            fragmentEntryId: fragment.slug,
            fragmentEntryKey: fragment.slug,
            type: fragment.metadata.type,
            html: fragment.html,
            css: fragment.css,
            js: fragment.js,
            configuration: fragment.fragmentConfiguration
          }))
        )
        .reduce((a, b) => [...a, ...b], []);

      it('imports collections to a Liferay Site', async () => {
        jest
          .spyOn(api, 'getFragmentCollections')
          .mockImplementation(async () => []);

        jest
          .spyOn(api, 'addFragmentCollection')
          .mockImplementation(async (...args) => {
            expect(args).toMatchSnapshot('addFragmentCollection');
            return '';
          });

        jest
          .spyOn(api, 'updateFragmentCollection')
          .mockImplementation(async () => {
            throw new Error(
              'updateFragmentCollection should not be called here'
            );
          });

        await importProject(GROUP_ID, projectContent);
      });

      it('updates collections if they already exist', async () => {
        jest
          .spyOn(api, 'getFragmentCollections')
          .mockImplementation(async () => apiCollections);

        jest
          .spyOn(api, 'addFragmentCollection')
          .mockImplementation(async () => {
            throw new Error('addFragmentCollection should not be called here');
          });

        jest
          .spyOn(api, 'updateFragmentCollection')
          .mockImplementation(async (...args) => {
            expect(args).toMatchSnapshot('updateFragmentCollection');
            return '';
          });

        jest
          .spyOn(api, 'getFragmentEntries')
          .mockImplementation(async () => []);

        await importProject(GROUP_ID, projectContent);
      });

      it('imports fragments to a Liferay site', async () => {
        jest
          .spyOn(api, 'getFragmentCollections')
          .mockImplementation(async () => apiCollections);

        jest
          .spyOn(api, 'getFragmentEntries')
          .mockImplementation(async () => []);

        jest
          .spyOn(api, 'addFragmentEntry')
          .mockImplementation(async (...args) => {
            expect(args).toMatchSnapshot('addFragmentEntry');
            return '';
          });

        jest.spyOn(api, 'updateFragmentEntry').mockImplementation(async () => {
          throw new Error('updateFragmentEntry should not be called here');
        });

        await importProject(GROUP_ID, projectContent);
      });

      it('updates fragments if they already exist', async () => {
        jest
          .spyOn(api, 'getFragmentCollections')
          .mockImplementation(async () => apiCollections);

        jest
          .spyOn(api, 'getFragmentEntries')
          .mockImplementation(async () => apiFragments);

        jest.spyOn(api, 'addFragmentEntry').mockImplementation(async () => {
          throw new Error('addFragmentEntry should not be called here');
        });

        jest
          .spyOn(api, 'updateFragmentEntry')
          .mockImplementation(async (...args) => {
            expect(args).toMatchSnapshot('updateFragmentEntry');
            return '';
          });

        await importProject(GROUP_ID, projectContent);
      });
    });
});
