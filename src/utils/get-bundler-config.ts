import path from 'path';

import { BUNDLER_OUTPUT_DIR } from './constants';
import getProjectContent from './project-content/get-project-content';
import { getProjectExports } from './project-content/get-project-exports';

export const getBundlerConfig = (): Record<string, any> => {
  const projectContent = getProjectContent(path.resolve('.'));
  const projectExports = getProjectExports(projectContent);

  if (projectExports.length) {
    return {
      'create-jar': false,
      source: 'src',
      output: BUNDLER_OUTPUT_DIR,
      workdir: path.join('build', 'liferay-npm-bundler-workdir'),
      exports: projectExports.reduce(
        (exportsObject, exportItem) => ({
          ...exportsObject,
          [exportItem.slug]: exportItem.path,
        }),
        {}
      ),
      imports: {
        __REACT_PROVIDER__: {
          react: '*',
        },
      },
      webpack: {
        module: {
          rules: [
            {
              exclude: /node_modules/,
              test: /\.js$/,
              use: [
                {
                  loader: 'babel-loader',
                  options: {
                    presets: ['@babel/preset-env', '@babel/preset-react'],
                  },
                },
              ],
            },
          ],
        },
      },
    };
  }

  return {};
};
