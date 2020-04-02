const fs = require('fs');
const path = require('path');
const YeomanTest = require('yeoman-test');

/**
 * @param  {string[]} paths
 */
function expectFile(...paths) {
  return expect(
    fs.readFileSync(path.join(...paths), 'utf-8')
  ).toMatchSnapshot();
}

/**
 * @param  {string} base
 * @param  {string[]} paths
 */
function expectFiles(base, paths) {
  return paths.map(_path => expectFile(path.join(base, _path)));
}

describe('page-template-generator', () => {
  it('generates a new master page', () =>
    YeomanTest.run(path.join(__dirname, '..'))
      .withOptions({ pageTemplateName: 'Sample Master Page' })
      .withOptions({ pageTemplateType: 'master-page' })
      .then(projectPath => {
        expectFiles(path.join(projectPath, 'src', 'sample-master-page'), [
          'master-page.json',
          'page-definition.json'
        ]);
      }));

  it('Generates a new page template', () =>
    YeomanTest.run(path.join(__dirname, '..'))
      .withOptions({ pageTemplateName: 'Sample Page Template' })
      .withOptions({ pageTemplateType: 'page-template' })
      .then(projectPath => {
        expectFiles(path.join(projectPath, 'src', 'sample-page-template'), [
          'page-template.json',
          'page-definition.json'
        ]);
      }));

  it('needs a name', () =>
    new Promise((resolve, reject) =>
      YeomanTest.run(path.join(__dirname, '..'))
        .withOptions({ pageTemplateType: 'master-page' })
        .then(reject)
        .catch(resolve)
    ));
});
