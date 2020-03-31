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

describe('fragment-generator', () => {
  it('generates a new fragment', () =>
    YeomanTest.run(path.join(__dirname, '..'))
      .withOptions({ fragmentCompositionName: 'Sample Fragment Composition' })
      .withOptions({ fragmentCollectionSlug: 'sample-collection' })
      .then(projectPath => {
        expectFiles(
          path.join(
            projectPath,
            'src',
            'sample-collection',
            'sample-fragment-composition'
          ),
          ['composition.json', 'definition.json']
        );
      }));

  it('needs a name', () =>
    new Promise((resolve, reject) =>
      YeomanTest.run(path.join(__dirname, '..'))
        .withOptions({ fragmentCollectionSlug: 'sample-collection' })
        .then(reject)
        .catch(resolve)
    ));

  it('needs a collection', () =>
    new Promise((resolve, reject) =>
      YeomanTest.run(path.join(__dirname, '..'))
        .withOptions({ fragmentCompositionName: 'Sample Fragment' })
        .then(reject)
        .catch(resolve)
    ));
});
