import { ISiteGroup } from '../../types';
import api from './api';

export default async function getSiteGroups(
  companyId: string
): Promise<ISiteGroup[]> {
  const stagingGroups = await api.getStagingGroups(companyId);
  const siteGroups = await api.getSiteGroups(companyId);

  return mergeStagingGroups(siteGroups, stagingGroups);
}

const isStagingGroup = (group: ISiteGroup) => group.liveGroupId !== '0';

const matchGroupId = (
  siteGroupId: string
): ((group: ISiteGroup) => boolean) => (group) =>
  siteGroupId === group.liveGroupId;

const mergeStagingGroups = (
  siteGroups: ISiteGroup[],
  stagingGroups: ISiteGroup[]
): ISiteGroup[] => [
  ...siteGroups.map(
    (siteGroup) =>
      stagingGroups.find(matchGroupId(siteGroup.groupId)) || siteGroup
  ),

  ...stagingGroups.filter(isStagingGroup),
];
