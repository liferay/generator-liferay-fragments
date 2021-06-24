import glob from 'glob';
import JSZip from 'jszip';
import ncp from 'ncp';
import path from 'path';

import api from '../utils/api';
import { extractZip } from '../utils/extract-zip';
import getProjectContent from '../utils/project-content/get-project-content';
import writeProjectContent from '../utils/project-content/write-project-content';
import { createTemporaryDirectory } from '../utils/temporary';
import exportCollections from './export-legacy';

const ZIP_PATHS = [
  'fragments',
  'master-pages',
  'page-templates',
  'display-page-templates',
];

export default async function exportProject(
  groupId: string,
  destinationPath: string
): Promise<void> {
  const projectContent = getProjectContent(destinationPath);
  const tmpDir = createTemporaryDirectory();

  try {
    await extractZip(
      await JSZip.loadAsync(await api.exportZip(groupId)),
      tmpDir.name
    );

    for (const zipPath of ZIP_PATHS) {
      const collectionPaths = glob.sync(path.join(tmpDir.name, zipPath, '*'));

      for (const collectionPath of collectionPaths) {
        await move(
          collectionPath,
          path.join(destinationPath, 'src', path.basename(collectionPath))
        );
      }
    }
  } catch (_) {
    projectContent.collections = await exportCollections(groupId);
    await writeProjectContent(projectContent.basePath, projectContent);
  }

  tmpDir.removeCallback();
}

function move(fromPath: string, toPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ncp(fromPath, toPath, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
