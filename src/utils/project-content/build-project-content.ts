import execa from 'execa';
import fs from 'fs';
import path from 'path';

import { IProject } from '../../../types';
import { BUNDLER_OUTPUT_DIR } from '../constants';
import { createTemporaryDirectory } from '../temporary';
import getProjectContent from './get-project-content';
import { getProjectExports } from './get-project-exports';
import writeProjectContent from './write-project-content';

export const buildProjectContent = async (
  projectContent: IProject
): Promise<IProject> => {
  const projectExports = getProjectExports(projectContent);

  const hasBundlerConfig = projectContent.unknownFiles.some(
    ({ filePath }) => filePath === 'liferay-npm-bundler.config.js'
  );

  let builtProjectContent = projectContent;

  if (hasBundlerConfig && projectExports.length) {
    await execa.command('npx @liferay/npm-bundler', {
      cwd: projectContent.basePath,
    });

    const tmpDir = createTemporaryDirectory();
    await writeProjectContent(tmpDir.name, projectContent);

    projectExports.forEach((exportItem) => {
      fs.copyFileSync(
        path.resolve(
          projectContent.basePath,
          BUNDLER_OUTPUT_DIR,
          exportItem.path
        ),
        path.resolve(tmpDir.name, 'src', exportItem.path)
      );
    });

    builtProjectContent = getProjectContent(tmpDir.name);
    tmpDir.removeCallback();
  }

  return builtProjectContent;
};
