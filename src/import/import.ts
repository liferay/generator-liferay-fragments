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
): Promise<undefined | [ImportResult[], ImportResult[]]> {
  try {
    const response = await api.importZip(
      await compress(projectContent, {
        [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: false,
      }),
      groupId
    );

    if (response.error) {
      throw new Error('Zip import error');
    }

    if (
      (response.fragmentEntriesImportResult &&
        response.fragmentEntriesImportResult.length > 0) ||
      (response.pageTemplatesImportResult &&
        response.pageTemplatesImportResult.length > 0)
    ) {
      return [
        response.fragmentEntriesImportResult || [],
        response.pageTemplatesImportResult || [],
      ];
    }
  } catch (_) {
    await importLegacy(projectContent, groupId);
  }
}
