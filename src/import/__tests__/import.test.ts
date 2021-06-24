import JSZip from 'jszip';

import { IProject } from '../../../types';
import compress from '../../compress/compress';
import api from '../../utils/api';
import { ADD_DEPLOYMENT_DESCRIPTOR_VAR } from '../../utils/constants';
import importProject from '../import';
import importLegacy from '../import-legacy';

jest.mock('../../compress/compress.ts', () => jest.fn());
jest.mock('../../utils/api.ts', () => ({ importZip: jest.fn() }));
jest.mock('../import-legacy.ts', () => jest.fn());

const mockedCompress = compress as jest.MockedFunction<typeof compress>;
const mockedImportLegacy = importLegacy as jest.MockedFunction<
  typeof importLegacy
>;
const mockedImportZip = api.importZip as jest.MockedFunction<
  typeof api['importZip']
>;

const SAMPLE_PROJECT: IProject = {
  basePath: 'sample/base/path',
  collections: [],
  project: {
    name: 'project-name',
  },
  unknownFiles: [],
  pageTemplates: [],
};

describe('import', () => {
  afterEach(() => {
    mockedCompress.mockReset();
    mockedImportLegacy.mockReset();
    mockedImportZip.mockReset();
  });

  it('calls compress with given project content', async () => {
    await importProject(SAMPLE_PROJECT, 'groupId1234');

    expect(compress).toHaveBeenCalledWith(SAMPLE_PROJECT, {
      [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: false,
    });
  });

  it('calls api.importZip with generated zip and groupId', async () => {
    mockedCompress.mockReturnValue(Promise.resolve(new JSZip()));

    await importProject(SAMPLE_PROJECT, 'groupId1234');

    expect(mockedImportZip).toHaveBeenCalledWith(
      expect.any(JSZip),
      'groupId1234'
    );
  });

  it('calls importLegacy if there is a compress error', async () => {
    mockedCompress.mockImplementation(() => {
      throw new Error('mec');
    });

    await importProject(SAMPLE_PROJECT, 'groupId');

    expect(mockedImportLegacy).toHaveBeenCalledWith(SAMPLE_PROJECT, 'groupId');
  });

  it('calls importLegacy if there is an api error', async () => {
    mockedImportZip.mockImplementation(() => {
      throw new Error('API error');
    });

    await importProject(SAMPLE_PROJECT, 'groupId');

    expect(mockedImportLegacy).toHaveBeenCalledWith(SAMPLE_PROJECT, 'groupId');
  });

  it('calls importLegacy if server returns an error response', async () => {
    mockedImportZip.mockReturnValue(Promise.resolve({ error: 'Some error' }));

    await importProject(SAMPLE_PROJECT, 'groupId');

    expect(mockedImportLegacy).toHaveBeenCalledWith(SAMPLE_PROJECT, 'groupId');
  });

  it('calls importLegacy if server returns an unknown response', async () => {
    mockedImportZip.mockReturnValue(Promise.resolve('Some random text'));

    await importProject(SAMPLE_PROJECT, 'groupId');

    expect(mockedImportLegacy).toHaveBeenCalledWith(SAMPLE_PROJECT, 'groupId');
  });

  it('returns a list of fragment and page template results', async () => {
    mockedImportZip.mockReturnValue(
      Promise.resolve({
        fragmentEntriesImportResult: [
          { status: 'status', name: 'name', errorMessage: '' },
        ],
        pageTemplatesImportResult: [
          {
            status: 'otherStatus',
            name: 'Page Template',
            errorMessage: 'something',
          },
        ],
      })
    );

    expect(await importProject(SAMPLE_PROJECT, 'groupId')).toEqual([
      [{ status: 'status', name: 'name', errorMessage: '' }],
      [
        {
          status: 'otherStatus',
          name: 'Page Template',
          errorMessage: 'something',
        },
      ],
    ]);
  });

  it('returns an empty list if there are no import results', async () => {
    mockedImportZip.mockReturnValue(Promise.resolve({}));

    expect(await importProject(SAMPLE_PROJECT, 'groupId')).toEqual([[], []]);
  });
});
