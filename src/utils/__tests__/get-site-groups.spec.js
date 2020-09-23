const getSiteGroups = require('../get-site-groups');

jest.mock('../api', () => ({
  getStagingGroups: () => [
    { descriptiveName: 'A (Staging)', groupId: 'sa', liveGroupId: 'aa' },
    { descriptiveName: 'B (Staging)', groupId: 'sb', liveGroupId: 'bb' },
    { descriptiveName: 'C', groupId: 'sc', liveGroupId: 'c' },
    { descriptiveName: 'D', groupId: 'sd', liveGroupId: 'd' },
  ],

  getSiteGroups: () => [
    { descriptiveName: 'A', groupId: 'a', liveGroupId: '0' },
    { descriptiveName: 'B', groupId: 'b', liveGroupId: '0' },
    { descriptiveName: 'C', groupId: 'c', liveGroupId: '0' },
    { descriptiveName: 'Global', groupId: 'global', liveGroupId: '0' },
  ],
}));

describe('getSiteGroups', () => {
  it('includes staging groups in the result', async () => {
    expect(await getSiteGroups('')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupId: 'sa' }),
        expect.objectContaining({ groupId: 'sb' }),
        expect.objectContaining({ groupId: 'sc' }),
      ])
    );
  });

  it('includes site groups in the result', async () => {
    expect(await getSiteGroups('')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupId: 'a' }),
        expect.objectContaining({ groupId: 'b' }),
        expect.objectContaining({ groupId: 'global' }),
      ])
    );
  });

  it('prefers staging groups than site groups if they are on both places', async () => {
    const groups = await getSiteGroups('');

    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ descriptiveName: 'C', groupId: 'sc' }),
      ])
    );

    expect(groups).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ descriptiveName: 'C', groupId: 'c' }),
      ])
    );
  });

  it('includes de global site as group', async () => {
    expect(await getSiteGroups('')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          descriptiveName: 'Global',
          groupId: 'global',
        }),
      ])
    );
  });
});
