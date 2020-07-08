const fs = require('fs');
const path = require('path');
const YeomanTest = require('yeoman-test');
const AdmZip = require('adm-zip');

describe('compress', () => {
  it('generates a zip file', () =>
    YeomanTest.run(path.join(__dirname, '..')).then(projectPath => {
      const zip = new AdmZip(
        path.join(projectPath, 'build/liferay-fragments.zip')
      );

      expect(zip).not.toBe(null);
    }));

  it('appends deployment descriptor', () =>
    YeomanTest.run(path.join(__dirname, '..'))
      .withOptions({ addDeploymentDescriptor: true })
      .withOptions({ companyWebId: '1' })
      .withOptions({ groupKey: '2' })
      .then(projectPath => {
        const zip = new AdmZip(
          path.join(projectPath, 'build/liferay-fragments.zip')
        );

        const descriptor = JSON.parse(
          zip.readAsText('liferay-deploy-fragments.json')
        );

        expect(descriptor).toMatchObject({
          companyWebId: '1',
          groupKey: '2'
        });
      }));

  it('appends all src files', () => {
    const fragmentFolderPath = 'collection/fragment';
    const fragmentFiles = ['index.html', 'main.js', 'styles.css'];

    return YeomanTest.run(path.join(__dirname, '..'))
      .inTmpDir(function(dir) {
        fs.mkdirSync(path.join(dir, 'src'));
        fs.mkdirSync(path.join(dir, 'src/collection'));
        fs.mkdirSync(path.join(dir, 'src/collection/fragment'));

        const composedPath = path.join(dir, 'src', fragmentFolderPath);
        fragmentFiles.forEach(file =>
          fs.writeFileSync(path.join(composedPath, file), '')
        );
      })
      .then(projectPath => {
        const zip = new AdmZip(
          path.join(projectPath, 'build/liferay-fragments.zip')
        );

        fragmentFiles.forEach(file => {
          expect(
            zip.getEntry(path.posix.join(fragmentFolderPath, file))
          ).not.toBe(null);
        });
      });
  });

  it('compiles scss files', () => {
    const fragmentFolderPath = 'collection/fragment';
    const srcFragmentFile = 'styles.scss';
    const dstFragmentFile = 'styles.css';

    return YeomanTest.run(path.join(__dirname, '..'))
      .inTmpDir(function(dir) {
        fs.mkdirSync(path.join(dir, 'src'));
        fs.mkdirSync(path.join(dir, 'src/collection'));
        fs.mkdirSync(path.join(dir, 'src/collection/fragment'));
        let metaData = {
          scss: { path: 'styles.scss' },
          name: 'fragment'
        };
        fs.writeFileSync(
          path.join(dir, 'src/collection/fragment.json'),
          JSON.stringify(metaData)
        );

        const composedPath = path.join(dir, 'src', fragmentFolderPath);
        fs.writeFileSync(
          path.join(composedPath, srcFragmentFile),
          'body{a{color:black;}}'
        );
      })
      .then(projectPath => {
        const zip = new AdmZip(
          path.join(projectPath, 'build/liferay-fragments.zip')
        );

        expect(
          zip
            .getEntry(path.posix.join(fragmentFolderPath, dstFragmentFile))
            .getData()
            .toString('utf8')
        ).toBe(
          `body a {
  color: black; }
`
        );
      });
  });
});
