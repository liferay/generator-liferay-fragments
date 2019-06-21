const { assertProjectContent, assertValidPath } = require('./assert');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const util = require('util');

const writeFilePromise = util.promisify(fs.writeFile);

/**
 * @param {string} path File path
 * @param {string} content New file content
 */
const _updateFile = async (path, content) => {
  await writeFilePromise(path, content);
};

/**
 * @param {string} path JSON file path
 * @param {object} content JSON content
 */
const _updateJSON = async (path, content) => {
  let newContent = content;

  try {
    const oldContent = require(path);

    newContent = Object.assign({}, oldContent, content);
  } catch (error) {}

  await _updateFile(path, JSON.stringify(newContent, null, 2));
};

/**
 * @param {string} fragmentBasePath Fragment base path
 * @param {import('../types/index').ICollection} collection
 * @param {import('../types/index').IFragment} fragment
 */
const _writeProjectFragment = async (
  fragmentBasePath,
  collection,
  fragment
) => {
  mkdirp.sync(fragmentBasePath);

  await _updateJSON(
    path.resolve(fragmentBasePath, 'fragment.json'),
    fragment.metadata
  );

  await _updateFile(
    path.resolve(fragmentBasePath, fragment.metadata.cssPath),
    fragment.css
  );

  await _updateFile(
    path.resolve(fragmentBasePath, fragment.metadata.configPath),
    fragment.config
  );

  await _updateFile(
    path.resolve(fragmentBasePath, fragment.metadata.htmlPath),
    fragment.html
  );

  await _updateFile(
    path.resolve(fragmentBasePath, fragment.metadata.jsPath),
    fragment.js
  );
};

/**
 * @param {string} collectionBasePath Collection base path
 * @param {import('../types/index').ICollection} collection
 */
const _writeProjectCollection = async (collectionBasePath, collection) => {
  mkdirp.sync(path.resolve(collectionBasePath));

  await _updateJSON(
    path.resolve(collectionBasePath, 'collection.json'),
    collection.metadata
  );

  await Promise.all(
    collection.fragments.map(fragment =>
      _writeProjectFragment(
        path.resolve(collectionBasePath, fragment.slug),
        collection,
        fragment
      )
    )
  );
};

/**
 * @param {string} projectBasePath
 * @param {import('../types/index').IProject} projectContent
 */
const writeProjectContent = async (projectBasePath, projectContent) => {
  assertValidPath(
    projectBasePath,
    'projectBasePath must be a valid filesystem path'
  );

  assertProjectContent(
    projectContent,
    'projectContent must be a valid project object'
  );

  mkdirp.sync(path.resolve(projectBasePath, 'src'));

  await _updateJSON(
    path.resolve(projectBasePath, 'package.json'),
    projectContent.project
  );

  await Promise.all(
    projectContent.collections.map(collection =>
      _writeProjectCollection(
        path.resolve(projectBasePath, 'src', collection.slug),
        collection
      )
    )
  );
};

module.exports = writeProjectContent;
