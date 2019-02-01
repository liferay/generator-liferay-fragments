const glob = require('glob');
const path = require('path');

/**
 * Gets a list of sample projects for testing
 * @return {string[]} Project paths
 */
const getTestFixtures = () =>
  glob.sync(`${path.resolve(__dirname, '..', 'fixtures')}${path.sep}*`);

module.exports = getTestFixtures;
