// @ts-ignore
const assert = require('assert') || require('assert').strict;
const path = require('path');

/**
 * @param {any} data Given data
 * @param {string} [message='Expected data to be an object'] Error message
 */
const assertObject = (data, message = 'Expected data to be an object') => {
  assert.notEqual(data, null, message);
  assert.equal(typeof data, 'object', message);
};

/**
 * @param {any} data Given data
 * @param {string} [message='Expected data to be an Array'] Error message
 */
const assertArray = (data, message = 'Expected data to be an Array') => {
  assertObject(data, message);
  assert.ok(data instanceof Array, message);
};

/**
 * @param {any} data Given data
 * @param {string} [message='Expected data to be a string'] Error message
 */
const assertString = (data, message = 'Expected data to be a string') => {
  assert.equal(typeof data, 'string', message);
};

/**
 * @param {any} data Given data
 * @param {string} [message='Expected data to be a projectContent'] Error message
 */
const assertProjectContent = (
  data,
  message = 'Expected data to be a projectContent'
) => {
  assertObject(data, message);
  assertObject(data.project, message);
  assertString(data.project.name, message);
  assertArray(data.collections, message);
};

/**
 * @param {any} data Given data
 * @param {string} [message='Expected data to be a valid path'] Error message
 */
const assertValidPath = (
  data,
  message = 'Expected data to be a valid path'
) => {
  assertString(data, message);
  assert.equal(data, path.normalize(data), message);
};

module.exports = {
  assertObject,
  assertArray,
  assertString,
  assertProjectContent,
  assertValidPath
};
