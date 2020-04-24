const api = require('./api');

/**
 * @param {import('../types/index').ISiteGroup} group Site group
 * @return {boolean} True if the give group is a staging group
 */
const isStagingGroup = group => group.liveGroupId !== '0';

/**
 * Returns a function that matches groups by live group ID
 * @param {string} siteGroupId Group life group ID matcher
 * @return {(group: import('../types/index').ISiteGroup) => boolean} Group matcher
 */
const matchGroupId = siteGroupId => {
  /**
   * @param {Object} group Group
   * @param {string} group.liveGroupId Group life group ID
   * @return {boolean} True if the given group has the stored live group ID
   */
  return group => siteGroupId === group.liveGroupId;
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
      stagingGroups.find(matchGroupId(siteGroup.groupId)) || siteGroup
  ),

  ...stagingGroups.filter(isStagingGroup)
];

/**
 * Returns a list of groups for the given company using the given api
 * @param {string} companyId Company ID
 * @return {Promise<import('../types/index').ISiteGroup[]>} Site groups
 */
const getSiteGroups = async companyId => {
  const stagingGroups = await api.getStagingGroups(companyId);
  const siteGroups = await api.getSiteGroups(companyId);

  return mergeStagingGroups(siteGroups, stagingGroups);
};

module.exports = getSiteGroups;
