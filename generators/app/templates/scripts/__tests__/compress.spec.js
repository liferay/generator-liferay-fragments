const compress = require('../compress');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');

describe('app-generator > compress', () => {
  let tmpDir;
  let tmpDirName;

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
    tmpDirName = tmpDir.name;
  });

  afterEach(() => {
    tmpDir.removeCallback();
  });

  it('generates a zip file', () => {
    compress(tmpDirName);
    expect(fs.existsSync(path.join(tmpDirName, 'fragments.zip'))).toBe(true);
  });
});
