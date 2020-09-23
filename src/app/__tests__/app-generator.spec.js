const fs = require('fs');
const glob = require('glob');
const path = require('path');
const YeomanTest = require('yeoman-test');

/**
 * @param {string} base
 * @param {string} _path
 */
function expectFile(base, _path) {
  const filePath = path.join(base, _path);
  const stat = fs.lstatSync(filePath);
  let content = '';

  if (stat.isFile()) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  return expect({
    filePath: _path.split(path.sep).join('/'),
    content,
  }).toMatchSnapshot();
}

/**
 * @param {string} base
 * @param {string[]} paths
 */
function expectFiles(base, paths) {
  return paths.map((_path) => expectFile(base, _path));
}

/**
 * @param {string} base
 */
function expectProjectFiles(base) {
  const templatesPath = path.resolve(__dirname, '..', 'templates');

  return expectFiles(
    base,
    glob.sync(`${templatesPath}/**/*`, { dot: true }).map((templatePath) =>
      path
        .resolve(templatePath)
        .replace(templatesPath, '')
        .replace(/\.ejs$/i, '')
    )
  );
}

describe('app-generator', () => {
  it('generates a new project', () =>
    YeomanTest.run(path.join(__dirname, '..')).then((projectPath) =>
      expectProjectFiles(path.join(projectPath, 'sample-liferay-fragments'))
    ));

  it('allows a custom repository name', () =>
    YeomanTest.run(path.join(__dirname, '..'))
      .withPrompts({ projectName: 'My Nice Custom Project' })
      .then((projectPath) =>
        expectProjectFiles(path.join(projectPath, 'my-nice-custom-project'))
      ));

  it('allows adding sample content', () =>
    YeomanTest.run(path.join(__dirname, '..'))
      .withPrompts({ addSampleContent: true })
      .then((projectPath) => {
        const contentPath = path.join(projectPath, 'sample-liferay-fragments');

        expectProjectFiles(contentPath);

        expectFiles(
          path.join(contentPath, 'src', 'sample-collection', 'sample-fragment'),
          ['fragment.json', 'index.html', 'styles.css', 'main.js']
        );
      }));
});
