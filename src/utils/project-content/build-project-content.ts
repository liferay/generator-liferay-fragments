import execa from 'execa';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';

import { IProject } from '../../../types';
import getProjectContent from './get-project-content';
import writeProjectContent from './write-project-content';

const OUTPUT_DIR = 'output';

interface Export {
  slug: string;
  path: string;
}

export const buildProjectContent = async (
  projectContent: IProject
): Promise<IProject> => {
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  await writeProjectContent(tmpDir.name, projectContent);

  const hasBundlerConfig = projectContent.unknownFiles.some(
    ({ filePath }) => filePath === 'liferay-npm-bundler.config.js'
  );

  const projectExports = _getProjectExports(tmpDir.name, projectContent);

  if (hasBundlerConfig && projectExports.length) {
    fs.writeFileSync(
      path.join(tmpDir.name, 'default-liferay-npm-bundler.config.js'),
      _getBundlerConfig(projectContent, projectExports)
    );

    await execa.command('npm ci', {
      cwd: tmpDir.name,
    });

    await execa.command('npx liferay-npm-bundler', {
      cwd: tmpDir.name,
    });

    projectExports.forEach((exportItem) => {
      fs.renameSync(
        path.resolve(tmpDir.name, OUTPUT_DIR, `${exportItem.slug}.bundle.js`),
        path.resolve(tmpDir.name, 'src', exportItem.path)
      );
    });
  }

  const builtProjectContent = getProjectContent(tmpDir.name);
  tmpDir.removeCallback();

  return builtProjectContent;
};

const _getProjectExports = (
  basePath: string,
  projectContent: IProject
): Export[] =>
  projectContent.collections
    .map((collection) =>
      collection.fragments
        .filter((fragment) => fragment.metadata.type === 'react')
        .map((fragment) => ({
          slug: fragment.slug,
          path: `.${path.sep}${path.join(
            collection.slug,
            fragment.slug,
            fragment.metadata.jsPath
          )}`,
        }))
    )
    .reduce((fragmentsA, fragmentsB) => {
      return fragmentsA.concat(fragmentsB);
    }, []);

const _getBundlerConfig = (
  projectContent: IProject,
  exports: Export[]
) => `module.exports = {
  "create-jar": false,
  source: "src",
  output: "${OUTPUT_DIR}",
  workdir: "build",
  exports: {
    ${exports
      .map((exportItem) => `"${exportItem.slug}": "${exportItem.path}"`)
      .join(',')}
  },
  imports: {
    "frontend-js-react-web": {
      react: "*"
    }
  },
  webpack: {
    module: {
      rules: [
        {
          exclude: /node_modules/,
          test: /\\.js$/,
          use: [
            {
              loader: "babel-loader",
              options: {
                presets: ["@babel/preset-env", "@babel/preset-react"]
              }
            }
          ]
        }
      ]
    }
  }
};`;
