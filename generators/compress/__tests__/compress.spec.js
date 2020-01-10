const compress = require('../compress');
const fs = require('fs');
const path = require('path');
// @ts-ignore
const tmp = require('tmp');
const checkZip = require('./check-zip');
const {
  ADD_DEPLOYMENT_DESCRIPTOR_VAR,
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR
} = require('../../../utils/constants');

describe('compress-generator/compress', () => {
  // @ts-ignore
  /** @type {import('tmp').SynchronousResult} */
  let tmpDir;

  /** @type {string} */
  let tmpDirName;

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
    tmpDirName = tmpDir.name;

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'package.json'),
      path.join(tmpDirName, 'package.json')
    );
  });

  afterEach(() => {
    // TmpDir.removeCallback();
  });

  it('generates a zip file', async () => {
    await compress(tmpDirName, {
      [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: 'true',
      [DEPLOYMENT_DESCRIPTOR_COMPANY_VAR]: 'liferay.com',
      [DEPLOYMENT_DESCRIPTOR_GROUP_VAR]: 'Guest'
    });
    await checkZip(tmpDirName);
  });

  it('appends deployment descriptor', async () => {
    await compress(tmpDirName, {
      companyWebId: 'liferay.com',
      groupKey: 'Guest'
    });
    await checkZip(tmpDirName);
  });

  it('appends existing collections', async () => {
    fs.mkdirSync(path.join(tmpDirName, 'src'));
    fs.mkdirSync(path.join(tmpDirName, 'src', 'sample-collection'));

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'collection.json'),
      path.join(tmpDirName, 'src', 'sample-collection', 'collection.json')
    );

    await compress(tmpDirName, {});
    await checkZip(tmpDirName, ['thumbnail.png']);
  });

  it('appends existing fragments', async () => {
    fs.mkdirSync(path.join(tmpDirName, 'src'));
    fs.mkdirSync(path.join(tmpDirName, 'src', 'sample-collection'));
    fs.mkdirSync(
      path.join(tmpDirName, 'src', 'sample-collection', 'sample-fragment')
    );

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'collection.json'),
      path.join(tmpDirName, 'src', 'sample-collection', 'collection.json')
    );

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'configuration.json'),
      path.join(
        tmpDirName,
        'src',
        'sample-collection',
        'sample-fragment',
        'configuration.json'
      )
    );

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'fragment.json'),
      path.join(
        tmpDirName,
        'src',
        'sample-collection',
        'sample-fragment',
        'fragment.json'
      )
    );

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'index.html'),
      path.join(
        tmpDirName,
        'src',
        'sample-collection',
        'sample-fragment',
        'index.html'
      )
    );

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'main.js'),
      path.join(
        tmpDirName,
        'src',
        'sample-collection',
        'sample-fragment',
        'main.js'
      )
    );

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'styles.css'),
      path.join(
        tmpDirName,
        'src',
        'sample-collection',
        'sample-fragment',
        'styles.css'
      )
    );

    fs.copyFileSync(
      path.join(__dirname, 'assets', 'thumbnail.png'),
      path.join(
        tmpDirName,
        'src',
        'sample-collection',
        'sample-fragment',
        'thumbnail.png'
      )
    );

    await compress(tmpDirName, {});
    await checkZip(tmpDirName, ['thumbnail.png']);
  });
});
