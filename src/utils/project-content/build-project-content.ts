import execa from 'execa';
import fs from 'fs';
import path from 'path';

import { IProject } from '../../../types';
import { BUNDLER_OUTPUT_DIR } from '../constants';
import { createTemporaryDirectory } from '../temporary';
import getProjectContent from './get-project-content';
import { getProjectExports } from './get-project-exports';
import writeProjectContent from './write-project-content';

const nodeModulesBinPath = path.normalize(
  path.resolve(__dirname, '../../../node_modules/.bin')
);

export const buildProjectContent = async (
  projectContent: IProject
): Promise<IProject> => {
  return await applySASS(
    projectContent.basePath,
    await applyNPMBundler(projectContent)
  );
};

async function applySASS(
  originalBasePath: string,
  projectContent: IProject
): Promise<IProject> {
  const tmpDir = createTemporaryDirectory();
  await writeProjectContent(tmpDir.name, projectContent);
  const builtProjectContent = getProjectContent(tmpDir.name);
  const sassBinaryPath = path.resolve(nodeModulesBinPath, 'sass');

  for (const collection of builtProjectContent.collections) {
    for (const fragment of collection.fragments) {
      const cssPath = fragment.metadata.cssPath.toLowerCase();

      if (cssPath.endsWith('.scss') || cssPath.endsWith('.sass')) {
        const absoluteFragmentPath = path.resolve(
          builtProjectContent.basePath,
          'src',
          collection.slug,
          fragment.directoryPath
        );

        const originalAbsoluteFragmentPath = absoluteFragmentPath.replace(
          builtProjectContent.basePath,
          originalBasePath
        );

        const absoluteCSSPath = path.resolve(
          absoluteFragmentPath,
          fragment.metadata.cssPath
        );

        const absoluteCSSDestinationPath = absoluteCSSPath.replace(
          /\.s(a|c)ss$/,
          '.css'
        );

        const loadPaths: string[] = [];

        const maybeAddPath = (absolutePath: string) => {
          if (fs.existsSync(absolutePath)) {
            loadPaths.push(absolutePath);
          }
        };

        for (const loadPath of fragment.metadata.sass?.loadPaths || []) {
          if (path.isAbsolute(loadPath)) {
            maybeAddPath(loadPath);
          } else {
            maybeAddPath(path.resolve(absoluteFragmentPath, loadPath));
            maybeAddPath(path.resolve(originalAbsoluteFragmentPath, loadPath));
          }
        }

        await execa(
          sassBinaryPath,
          [
            absoluteCSSPath,
            absoluteCSSDestinationPath,
            '--no-source-map',
            `--load-path=${path.dirname(absoluteCSSPath)}`,
            ...loadPaths.map((sassLoadPath) => `--load-path=${sassLoadPath}`),
          ],
          {
            cwd: builtProjectContent.basePath,
          }
        );

        if (!fs.existsSync(absoluteCSSDestinationPath)) {
          throw new Error('Build error');
        }

        fragment.css = fs.readFileSync(absoluteCSSDestinationPath, 'utf8');

        fragment.metadata.cssPath = fragment.metadata.cssPath.replace(
          /\.s(a|c)ss$/,
          '.css'
        );

        delete fragment.metadata.sass;

        fragment.unknownFiles = fragment.unknownFiles.filter((unknownFile) => {
          const filePath = unknownFile.filePath.toLowerCase();

          return !filePath.endsWith('.scss') && !filePath.endsWith('.sass');
        });
      }
    }
  }

  tmpDir.removeCallback();

  return builtProjectContent;
}

async function applyNPMBundler(projectContent: IProject): Promise<IProject> {
  const projectExports = getProjectExports(projectContent);

  const hasBundlerConfig = projectContent.unknownFiles.some(
    ({ filePath }) => filePath === 'liferay-npm-bundler.config.js'
  );

  let builtProjectContent = projectContent;

  const bundlerBinaryPath = path.resolve(
    nodeModulesBinPath,
    'liferay-npm-bundler'
  );

  if (
    hasBundlerConfig &&
    fs.existsSync(bundlerBinaryPath) &&
    projectExports.length
  ) {
    await execa.command(bundlerBinaryPath, {
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
}
