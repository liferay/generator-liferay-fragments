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
  return paths.map((_path) => expectFile(path.join(base, _path)));
}

describe('fragment-generator', () => {
  it('needs a name', () =>
    new Promise((resolve, reject) => {
      YeomanTest.run(path.join(__dirname, '..'))
        .withOptions({ fragmentType: 'section' })
        .withOptions({ fragmentCollectionSlug: 'sample-collection' })
        .then(reject)
        .catch(resolve);
    }));

  it('needs a collection', () =>
    new Promise((resolve, reject) => {
      YeomanTest.run(path.join(__dirname, '..'))
        .withOptions({ fragmentName: 'Sample Fragment' })
        .withOptions({ fragmentType: 'component' })
        .then(reject)
        .catch(resolve);
    }));

  test.each(['component', 'react', 'input'])(
    'generates a %p fragment',
    (fragmentType) =>
      YeomanTest.run(path.join(__dirname, '..'))
        .withOptions({ fragmentName: 'Sample Fragment' })
        .withOptions({ fragmentType })
        .withOptions({ fragmentCollectionSlug: 'sample-collection' })
        .then((projectPath) => {
          expectFiles(
            path.join(
              projectPath,
              'src',
              'sample-collection',
              'sample-fragment'
            ),
            [
              'configuration.json',
              'fragment.json',
              'index.html',
              'styles.css',
              'main.js',
            ]
          );
        })
  );
});
