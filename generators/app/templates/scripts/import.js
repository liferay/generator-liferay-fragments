const chalk = require('chalk');
const fs = require('fs');
const glob = require('glob');
const { logError, logNewLine, logIndent } = require('./log');
const path = require('path');
const {
  askPortalData,
  getGroupId,
  getHost,
  getPassword,
  getUsername
} = require('./portal');
const readline = require('readline-sync');
const request = require('request');

const objectsInProcess = {};

function _importCollections() {
  glob
    .sync(`${__dirname}/../src/*/collection.json`)
    .map(collectionJSON => path.resolve(`${collectionJSON}/..`))
    .forEach(collectionDirectory => {
      const collectionJSON = JSON.parse(
        fs.readFileSync(`${collectionDirectory}/collection.json`)
      );

      const collectionKey = path.basename(collectionDirectory);

      objectsInProcess[`collection${collectionJSON.name}`] = true;

      request.post(
        {
          auth: {
            user: getUsername(),
            pass: getPassword()
          },
          formData: {
            groupId: getGroupId(),
            fragmentCollectionKey: collectionKey,
            name: collectionJSON.name,
            description: collectionJSON.description
          },
          jar: true,
          url: `${getHost()}/api/jsonws/fragment.fragmentcollection/add-fragment-collection`
        },
        (error, response, body) => {
          logNewLine(
            `Deploying collection ${chalk.reset(collectionJSON.name)}`
          );

          if (error || (response && response.statusCode !== 200)) {
            if (
              response.body &&
              response.body.lastIndexOf(
                'DuplicateFragmentCollectionKeyException'
              ) !== -1
            ) {
              _updateCollection(
                collectionJSON,
                collectionKey,
                collectionDirectory
              );
            } else {
              logError(
                `Error deploying collection ${chalk.reset(
                  collectionJSON.name
                )}: ${error}, ${response}`
              );

              process.exit(-1);
            }
          } else {
            const collection = JSON.parse(body);

            _importFragments(collectionDirectory, collection, false);
          }
        }
      );
    });
}

function _importFragments(collectionDirectory, collection, updateAll) {
  glob
    .sync(`${collectionDirectory}/*/fragment.json`)
    .map(fragmentJSON => path.resolve(`${fragmentJSON}/..`))
    .forEach(fragmentDirectory => {
      const fragmentJSON = JSON.parse(
        fs.readFileSync(`${fragmentDirectory}/fragment.json`)
      );

      const fragmentKey = path.basename(fragmentDirectory);

      logIndent(`fragment ${chalk.reset(fragmentJSON.name)}`);

      const css = fs.readFileSync(
        `${fragmentDirectory}/${fragmentJSON.cssPath}`
      );
      const html = fs.readFileSync(
        `${fragmentDirectory}/${fragmentJSON.htmlPath}`
      );
      const js = fs.readFileSync(`${fragmentDirectory}/${fragmentJSON.jsPath}`);

      objectsInProcess[`fragment${fragmentJSON.name}`] = true;

      delete objectsInProcess[`collection${collection.name}`];

      request.post(
        {
          auth: {
            user: getUsername(),
            pass: getPassword()
          },
          formData: {
            groupId: getGroupId(),
            fragmentCollectionId: collection.fragmentCollectionId,
            fragmentEntryKey: fragmentKey,
            name: fragmentJSON.name,
            css: css,
            html: html,
            js: js,
            status: 0
          },
          jar: true,
          url: `${getHost()}/api/jsonws/fragment.fragmententry/add-fragment-entry`
        },
        (error, response) => {
          if (error || (response && response.statusCode !== 200)) {
            if (
              response.body &&
              response.body.lastIndexOf(
                'DuplicateFragmentEntryKeyException'
              ) !== -1
            ) {
              _updateFragment(
                fragmentJSON.name,
                fragmentKey,
                collection.fragmentCollectionId,
                css,
                html,
                js,
                updateAll
              );
            } else {
              logError(
                `Error deploying fragment ${chalk.reset(
                  fragmentJSON.name
                )}: ${error}, ${response}`
              );

              process.exit(-1);
            }
          } else {
            _removeLock(`fragment${fragmentJSON.name}`);
          }
        }
      );
    });
}

function _getCollection(name, key, callback) {
  request.get(
    `${getHost()}/api/jsonws/fragment.fragmentcollection/get-fragment-collections/group-id/${getGroupId()}/name/${name}/start/-1/end/-1/-order-by-comparator`,
    {
      auth: {
        user: getUsername(),
        pass: getPassword()
      },
      jar: true
    },
    (error, response, body) => {
      if (error || (response && response.statusCode !== 200)) {
        logError(
          `Error deploying collection ${chalk.reset(
            name
          )}: ${error}, ${response}`
        );

        process.exit(-1);
      }

      const collections = JSON.parse(body);

      let collection = {};

      collections.forEach(item => {
        collection = item.fragmentCollectionKey === key ? item : collection;

        return collection;
      });

      callback(collection);
    }
  );
}

function _getFragment(name, key, collectionId, callback) {
  request.get(
    `${getHost()}/api/jsonws/fragment.fragmententry/get-fragment-entries/group-id/${getGroupId()}/fragment-collection-id/${collectionId}/name/${name}/status/0/start/-1/end/-1/-order-by-comparator`,
    {
      auth: {
        user: getUsername(),
        pass: getPassword()
      },
      jar: true
    },
    (error, response, body) => {
      if (error || (response && response.statusCode !== 200)) {
        logError(
          `Error deploying fragment ${chalk.reset(name)}: ${error}, ${response}`
        );

        process.exit(-1);
      }

      const fragments = JSON.parse(body);

      let fragment = {};

      fragments.forEach(item => {
        fragment = item.fragmentEntryKey === key ? item : fragment;

        return fragment;
      });

      callback(fragment);
    }
  );
}

function _updateCollection(collectionJSON, collectionKey, collectionDirectory) {
  let answer = readline.question(
    `Collection "${
      collectionJSON.name
    }" already exists, update it including all the fragments? [A/y/n] `
  );

  const updateFlag = (answer || 'A').toLowerCase();

  switch (updateFlag.charAt(0)) {
    case 'a':
      _getCollection(collectionJSON.name, collectionKey, collection => {
        request.post(
          {
            auth: {
              user: getUsername(),
              pass: getPassword()
            },
            formData: {
              groupId: getGroupId(),
              fragmentCollectionId: collection.fragmentCollectionId,
              name: collectionJSON.name,
              description: collectionJSON.description
            },
            jar: true,
            url: `${getHost()}/api/jsonws/fragment.fragmentcollection/update-fragment-collection`
          },
          (error, response, body) => {
            if (error || (response && response.statusCode !== 200)) {
              logError(
                `Error updating collection ${chalk.reset(
                  collectionJSON.name
                )}: ${error}, ${response}`
              );

              process.exit(-1);
            }

            const collection = JSON.parse(body);

            _importFragments(collectionDirectory, collection, true);
          }
        );
      });
      break;
    case 'y':
      _getCollection(collectionJSON.name, collectionKey, collection => {
        request.post(
          {
            auth: {
              user: getUsername(),
              pass: getPassword()
            },
            formData: {
              groupId: getGroupId(),
              fragmentCollectionId: collection.fragmentCollectionId,
              name: collectionJSON.name,
              description: collectionJSON.description
            },
            jar: true,
            url: `${getHost()}/api/jsonws/fragment.fragmentcollection/update-fragment-collection`
          },
          (error, response, body) => {
            if (error || (response && response.statusCode !== 200)) {
              logError(
                `Error updating collection ${chalk.reset(
                  collectionJSON.name
                )}: ${error}, ${response}`
              );

              process.exit(-1);
            }

            const collection = JSON.parse(body);

            _importFragments(collectionDirectory, collection, false);
          }
        );
      });
      break;
    default:
      logNewLine(
        `Skipping existing collection ${chalk.reset(collectionJSON.name)}`
      );
      break;
  }
}

function _updateFragment(name, key, collectionId, css, html, js, updateAll) {
  function doUpdateFragment(fragment) {
    request.post(
      {
        auth: {
          user: getUsername(),
          pass: getPassword()
        },
        formData: {
          groupId: getGroupId(),
          fragmentEntryId: fragment.fragmentEntryId,
          name: name,
          css: css,
          html: html,
          js: js,
          status: 0
        },
        jar: true,
        url: `${getHost()}/api/jsonws/fragment.fragmententry/update-fragment-entry`
      },
      (error, response) => {
        if (error || (response && response.statusCode !== 200)) {
          logError(
            `Error updating fragment ${chalk.reset(
              name
            )}: ${error}, ${response}`
          );

          process.exit(-1);
        } else {
          _removeLock(`fragment${name}`);
        }
      }
    );
  }

  _getFragment(name, key, collectionId, fragment => {
    if (updateAll) {
      doUpdateFragment(fragment);
    } else {
      let answer = readline.question(
        `Fragment "${name}" already exists, update it including all the fragments? [Y/n]`
      );

      const updateFlag = (answer || 'y').toLowerCase();

      switch (updateFlag.charAt(0)) {
        case 'y':
          doUpdateFragment(fragment);
          break;
        default:
          logNewLine(`Skipping existing fragment ${chalk.reset(name)}`);

          _removeLock(`fragment${name}`);
          break;
      }
    }
  });
}

function _removeLock(lockName) {
  delete objectsInProcess[lockName];

  if (Object.entries(objectsInProcess).length === 0) {
    process.stdin.destroy();
  }
}

askPortalData(_importCollections);

process.on('exit', exitCode => {
  if (exitCode !== -1) {
    logNewLine('Done! Your fragments are available in your Liferay instance.');
  }
});
