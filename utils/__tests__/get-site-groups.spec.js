jest.mock('../api', () => ({
  getStagingCompanies: () => [
    { descriptiveName: 'A (Staging)', groupId: 'sa' },
    { descriptiveName: 'B (Staging)', groupId: 'sb' },
    { descriptiveName: 'C', groupId: 'sc' },
    { descriptiveName: 'D', groupId: 'sd' }
  ],

  getSiteGroups: () => [
    { descriptiveName: 'A', groupId: 'a' },
    { descriptiveName: 'B', groupId: 'b' },
    { descriptiveName: 'C', groupId: 'c' },
    { descriptiveName: 'Global', groupId: 'global' }
  ]
}));

const getSiteGroups = require('../get-site-groups');

describe('getSiteGroups', () => {
  it('includes staging groups in the result', async () => {
    expect(await getSiteGroups('')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupId: 'sa' }),
        expect.objectContaining({ groupId: 'sb' }),
        expect.objectContaining({ groupId: 'sc' })
      ])
    );
  });

  it('includes site groups in the result', async () => {
    expect(await getSiteGroups('')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupId: 'a' }),
        expect.objectContaining({ groupId: 'b' }),
        expect.objectContaining({ groupId: 'global' })
      ])
    );
  });

  it('prefers staging groups than site groups if they are on both places', async () => {
    const groups = await getSiteGroups('');

    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ descriptiveName: 'C', groupId: 'sc' })
      ])
    );

    expect(groups).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ descriptiveName: 'C', groupId: 'c' })
      ])
    );
  });

  it('filters staging groups with a name not ending with (Staging)', async () => {
    expect(await getSiteGroups('')).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ groupId: 'sd' })])
    );
  });

  it('includes de global site as group', async () => {
    expect(await getSiteGroups('')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          descriptiveName: 'Global',
          groupId: 'global'
        })
      ])
    );
  });
});
