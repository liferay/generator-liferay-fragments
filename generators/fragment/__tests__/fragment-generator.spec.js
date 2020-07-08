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
      .withOptions({ minLiferayVersion: '7.2.0' })
      .withOptions({ fragmentName: 'Sample Fragment' })
      .withOptions({ fragmentType: 'section' })
      .withOptions({ fragmentCollectionSlug: 'sample-collection' })
      .withPrompts({ useScss: false })
      .then(projectPath => {
        expectFiles(
          path.join(projectPath, 'src', 'sample-collection', 'sample-fragment'),
          ['fragment.json', 'index.html', 'styles.css', 'main.js']
        );
      }));

  it('needs a name', () =>
    new Promise((resolve, reject) =>
      YeomanTest.run(path.join(__dirname, '..'))
        .withOptions({ minLiferayVersion: '7.2.0' })
        .withOptions({ fragmentType: 'section' })
        .withOptions({ fragmentCollectionSlug: 'sample-collection' })
        .then(reject)
        .catch(resolve)
    ));

  it('needs a collection', () =>
    new Promise((resolve, reject) =>
      YeomanTest.run(path.join(__dirname, '..'))
        .withOptions({ minLiferayVersion: '7.2.0' })
        .withOptions({ fragmentName: 'Sample Fragment' })
        .withOptions({ fragmentType: 'section' })
        .then(reject)
        .catch(resolve)
    ));

  it('generates new features if supported', () =>
    YeomanTest.run(path.join(__dirname, '..'))
      .withOptions({ minLiferayVersion: '7.3.3' })
      .withOptions({ fragmentName: 'Sample Fragment' })
      .withOptions({ fragmentType: 'section' })
      .withOptions({ fragmentCollectionSlug: 'sample-collection' })
      .withPrompts({ useScss: false })
      .then(projectPath => {
        expectFiles(
          path.join(projectPath, 'src', 'sample-collection', 'sample-fragment'),
          ['fragment.json', 'index.html', 'styles.css', 'main.js']
        );
      }));

  it('generates fragment with scss', () =>
    YeomanTest.run(path.join(__dirname, '..'))
      .withOptions({ minLiferayVersion: '7.3.3' })
      .withOptions({ fragmentName: 'Sample Fragment' })
      .withOptions({ fragmentType: 'section' })
      .withOptions({ fragmentCollectionSlug: 'sample-collection' })
      .withPrompts({ useScss: true })
      .then(projectPath => {
        expectFiles(
          path.join(projectPath, 'src', 'sample-collection', 'sample-fragment'),
          ['fragment.json', 'index.html', 'styles.scss', 'main.js']
        );
      }));
});
