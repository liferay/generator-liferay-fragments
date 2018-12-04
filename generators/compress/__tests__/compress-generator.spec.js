const path = require('path');
const YeomanTest = require('yeoman-test');
const checkZip = require('./check-zip');

describe('compress-generator', () => {
  it('compress a liferay-fragments project', () =>
    YeomanTest.run(path.join(__dirname, '..')).then(async projectPath => {
      await checkZip(projectPath);
    }));
});
