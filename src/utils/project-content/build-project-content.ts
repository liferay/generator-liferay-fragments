import execa from 'execa';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import tmp from 'tmp';

import { IProject } from '../../../types';
import getProjectContent from './get-project-content';
import writeProjectContent from './write-project-content';

const OUTPUT_DIR = path.join('build', 'liferay-npm-bundler-output');

interface Export {
  slug: string;
  path: string;
}

export const buildProjectContent = async (
  projectContent: IProject
): Promise<IProject> => {
  const hasBundlerConfig = projectContent.unknownFiles.some(
    ({ filePath }) => filePath === 'liferay-npm-bundler.config.js'
  );

  let builtProjectContent = projectContent;
  const projectExports = _getProjectExports(projectContent);

  if (hasBundlerConfig && projectExports.length) {
    await execa.command('npm ci', {
      cwd: projectContent.basePath,
    });

    try {
      fs.writeFileSync(
        path.join(
          projectContent.basePath,
          'default-liferay-npm-bundler.config.js'
        ),
        _getBundlerConfig(projectContent, projectExports)
      );

      // Allow users "debug" their bundler configuration by executing
      // the configuration file, so console.log and other operations
      // are shown in log.

      try {
        require(path.join(
          projectContent.basePath,
          'liferay-npm-bundler.config.js'
        ));
      } catch (_) {}

      await execa.command('npx liferay-npm-bundler', {
        cwd: projectContent.basePath,
      });
    } finally {
      rimraf.sync(
        path.join(
          projectContent.basePath,
          'default-liferay-npm-bundler.config.js'
        )
      );
    }

    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    await writeProjectContent(tmpDir.name, projectContent);

    projectExports.forEach((exportItem) => {
      fs.renameSync(
        path.resolve(projectContent.basePath, OUTPUT_DIR, exportItem.path),
        path.resolve(tmpDir.name, 'src', exportItem.path)
      );
    });

    builtProjectContent = getProjectContent(tmpDir.name);
    tmpDir.removeCallback();
  }

  return builtProjectContent;
};

const _getProjectExports = (projectContent: IProject): Export[] =>
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
  workdir: "${path.join('build', 'liferay-npm-bundler-workdir')}",
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
