import { IProject } from '../../types';
import compress from '../compress/compress';
import api from '../utils/api';
import { ADD_DEPLOYMENT_DESCRIPTOR_VAR } from '../utils/constants';
import importLegacy from './import-legacy';

export interface ImportResult {
  name: string;
  errorMessage: string;
  status: string;
}

export default async function importProject(
  projectContent: IProject,
  groupId: string
): Promise<ImportResult[][]> {
  try {
    const response = await api.importZip(
      await compress(projectContent, {
        [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: false,
      }),
      groupId
    );

    if (typeof response === 'string') {
      throw new Error(response);
    } else if (response.error) {
      throw new Error(response.error);
    }

    return [
      Array.isArray(response.fragmentEntriesImportResult)
        ? response.fragmentEntriesImportResult
        : [],
      Array.isArray(response.pageTemplatesImportResult)
        ? response.pageTemplatesImportResult
        : [],
    ];
  } catch (_) {
    return [await importLegacy(projectContent, groupId), []];
  }
}
