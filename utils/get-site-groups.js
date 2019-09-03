const api = require('./api');

/**
 * @param {import('../types/index').ISiteGroup} group Site group
 * @return {boolean} True if the give group is a staging group
 */
const isStagingGroup = group => group.descriptiveName.endsWith(' (Staging)');

/**
 * Returns a function that matches groups by descriptiveName
 * @param {string} descriptiveName Group descriptiveName matcher
 * @return {(group: import('../types/index').ISiteGroup) => boolean} Group matcher
 */
const matchGroupName = descriptiveName => {
  /**
   * @param {Object} group Group
   * @param {string} group.descriptiveName Group name
   * @return {boolean} True if the given group has the stored descriptiveName
   */
  return group => descriptiveName === group.descriptiveName;
};

/**
 * Returns the result of merging siteGroups with stagingGroups
 * @param {import('../types/index').ISiteGroup[]} siteGroups Site groups
 * @param {import('../types/index').ISiteGroup[]} stagingGroups Staging groups
 * @return {import('../types/index').ISiteGroup[]} Merged groups
 */
const mergeStagingGroups = (siteGroups, stagingGroups) => [
  ...siteGroups.map(
    siteGroup =>
      stagingGroups.find(matchGroupName(siteGroup.descriptiveName)) || siteGroup
  ),

  ...stagingGroups.filter(isStagingGroup)
];

/**
 * Returns a list of groups for the given company using the given api
 * @param {string} companyId Company ID
 * @return {Promise<import('../types/index').ISiteGroup[]>} Site groups
 */
const getSiteGroups = async companyId => {
  const stagingGroups = await api.getStagingCompanies(companyId);
  const siteGroups = await api.getSiteGroups(companyId);

  return mergeStagingGroups(siteGroups, stagingGroups);
};

module.exports = getSiteGroups;
