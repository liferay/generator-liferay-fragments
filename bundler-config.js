const path = require('path');

const { BUNDLER_OUTPUT_DIR } = require('./generators/utils/constants');
const {
  default: getProjectContent,
} = require('./generators/utils/project-content/get-project-content');
const {
  getProjectExports,
} = require('./generators/utils/project-content/get-project-exports');

module.exports = (() => {
  const projectContent = getProjectContent(path.resolve('.'));
  const projectExports = getProjectExports(projectContent);

  if (projectExports.length) {
    return {
      'create-jar': false,
      source: 'src',
      output: BUNDLER_OUTPUT_DIR,
      workdir: path.join('build', 'liferay-npm-bundler-workdir'),
      exports: exports.reduce(
        (exportsObject, exportItem) => ({
          ...exportsObject,
          [exportItem.slug]: exportItem.path,
        }),
        {}
      ),
      imports: {
        'frontend-js-react-web': {
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
})();
