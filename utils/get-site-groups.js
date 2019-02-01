/**
 * Global site descriptiveName
 * @type {string}
 */
const GLOBAL_SITE_DESCRIPTIVE_NAME = 'Global';

/**
 * @param {Object} group Site group
 * @param {string} group.descriptiveName Site group name
 * @return {boolean} True if the give group is a staging group
 */
const isStagingGroup = group => group.descriptiveName.endsWith(' (Staging)');

/**
 * Returns a function that matches groups by descriptiveName
 * @param {string} descriptiveName Group descriptiveName matcher
 * @return {Function} Group matcher
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
 * @param {Array<{ descriptiveName: string, groupId: string }>} siteGroups Site groups
 * @param {Array<{ descriptiveName: string, groupId: string }>} stagingGroups Staging groups
 * @return {Array<Object>} Merged groups
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
 * @param {Function} api Wrapped api function
 * @param {string} companyId Company ID
 * @return {Promise<Array<Object>>} Site groups
 */
const getSiteGroups = async (api, companyId) => {
  const stagingGroups = await api(
    `/group/get-groups/company-id/${companyId}/parent-group-id/0/site/false`
  );

  const siteGroups = await api(
    `/group/get-groups/company-id/${companyId}/parent-group-id/0/site/true`
  );

  return mergeStagingGroups(siteGroups, stagingGroups).filter(
    group => group.descriptiveName !== GLOBAL_SITE_DESCRIPTIVE_NAME
  );
};

module.exports = getSiteGroups;
