const chalk = require('chalk');
const fs = require('fs');
const glob = require('glob');
const JSZip = require('jszip');
const path = require('path');
const { log, logNewLine, logIndent, logSecondary } = require('../../utils/log');

const compress = basePath =>
  new Promise(resolve => {
    const zip = new JSZip();

    logNewLine('Generating zip file');

    glob
      .sync(path.join(basePath, 'src', '*', 'collection.json'))
      .map(collectionJSON => path.resolve(collectionJSON, '..'))
      .forEach(collectionDirectory => {
        const collectionName = path.basename(collectionDirectory);
        const rest = collectionDirectory.replace(collectionName, '');

        zip.file(
          path
            .normalize(path.join(collectionName, 'collection.json'))
            .split(path.sep)
            .join('/'),
          fs.readFileSync(
            path.resolve(collectionDirectory, 'collection.json'),
            'utf-8'
          )
        );

        logNewLine(`Collection ${chalk.reset(collectionName)}`);

        glob
          .sync(path.join(collectionDirectory, '*', 'fragment.json'))
          .map(fragmentJSON => path.resolve(fragmentJSON, '..'))
          .forEach(fragmentDirectory => {
            const fragmentName = path.basename(fragmentDirectory);

            logIndent(`fragment ${chalk.reset(fragmentName)}`);

            glob
              .sync(path.join(fragmentDirectory, '**', '*'))
              .filter(fragmentFilePath =>
                fs.lstatSync(fragmentFilePath).isFile()
              )
              .map(fragmentFilePath => path.resolve(fragmentFilePath))
              .map(fragmentFilePath => ({
                fragmentFileContent: fs.readFileSync(fragmentFilePath, 'utf-8'),
                fragmentFileLocalPath: fragmentFilePath.replace(rest, '')
              }))
              .forEach(({ fragmentFileContent, fragmentFileLocalPath }) => {
                zip.file(
                  path
                    .normalize(fragmentFileLocalPath)
                    .split(path.sep)
                    .join('/'),
                  fragmentFileContent
                );
              });
          });
      });

    try {
      fs.mkdirSync(path.join(basePath, 'build'));
    } catch (error) {}

    zip
      .generateNodeStream({
        type: 'nodebuffer',
        streamFiles: true
      })
      .pipe(
        fs.createWriteStream(
          path.join(basePath, 'build', 'liferay-fragments.zip')
        )
      )
      .on('finish', () => {
        logNewLine('build/liferay-fragments.zip file created ');
        log('Import them to your liferay-portal to start using them:');
        logSecondary(
          'https://dev.liferay.com/discover/portal/-/knowledge_base/7-1/exporting-and-importing-fragments#importing-collections'
        );
        resolve();
      });
  });

module.exports = compress;
