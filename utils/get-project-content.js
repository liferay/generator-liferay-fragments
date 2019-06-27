const fs = require('fs');
const glob = require('glob');
const path = require('path');

/**
 * @param {string} jsonPath
 * @return {object}
 */
function _readJSONSync(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

/**
 * Get a list of project collections from a given basePath
 * @param {string} basePath Base path
 * @return {import('../types/index').ICollection[]}
 */
function _getProjectCollections(basePath) {
  return glob
    .sync(path.join(basePath, 'src', '*', 'collection.json'))
    .map(
      /** @param {string} collectionJSON */
      collectionJSON => path.resolve(collectionJSON, '..')
    )
    .map(
      /** @param {string} directory */
      directory => {
        const metadata = _readJSONSync(
          path.resolve(directory, 'collection.json')
        );
        const fragments = _getCollectionFragments(directory);
        const slug = path.basename(directory);

        return {
          slug,
          fragmentCollectionId: slug,
          fragmentCollectionKey: slug,
          metadata,
          fragments
        };
      }
    );
}

/**
 * Get a list of fragments from a given collection directory
 * @param {string} collectionDirectory
 * @return {import('../types/index').IFragment[]}
 */
function _getCollectionFragments(collectionDirectory) {
  return glob
    .sync(path.join(collectionDirectory, '*', 'fragment.json'))
    .map(
      /** @param {string} fragmentJSON */
      fragmentJSON => path.resolve(fragmentJSON, '..')
    )
    .map(
      /** @param {string} directory */
      directory => {
        const metadata = _readJSONSync(
          path.resolve(directory, 'fragment.json')
        );

        return {
          slug: path.basename(directory),
          metadata,

          html: fs.readFileSync(
            path.resolve(directory, metadata.htmlPath),
            'utf-8'
          ),

          css: fs.readFileSync(
            path.resolve(directory, metadata.cssPath),
            'utf-8'
          ),

          js: fs.readFileSync(
            path.resolve(directory, metadata.jsPath),
            'utf-8'
          ),

          fragmentConfiguration: _getFramentConfiguration(
            directory,
            metadata.fragmentConfigurationPath
          )
        };
      }
    );
}

/**
 * Gets the fragment configuration from its file, if exist, if not it
 * returns an empty string
 * @param {string} directory
 * @param {string} fragmentConfigurationPath
 * @return {string} Configuration
 */
function _getFramentConfiguration(directory, fragmentConfigurationPath) {
  if (
    fragmentConfigurationPath &&
    fs.existsSync(path.resolve(directory, fragmentConfigurationPath))
  ) {
    return fs.readFileSync(
      path.resolve(directory, fragmentConfigurationPath),
      'utf-8'
    );
  }

  return '';
}

/**
 * Gets a project definition from a given basePath
 * @param {string} basePath Base path
 * @return {import('../types/index').IProject} Project
 */
function getProjectContent(basePath) {
  return {
    basePath,
    project: _readJSONSync(path.resolve(basePath, 'package.json')),
    collections: _getProjectCollections(basePath)
  };
}

module.exports = getProjectContent;
