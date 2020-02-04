// @ts-ignore
const chokidar = require('chokidar');
const path = require('path');
const AuthGenerator = require('../../utils/auth-generator');
const importProject = require('./import');
const { log } = require('../../utils/log');

const {
  IMPORT_WATCH_VAR,
  LIFERAY_COMPANYID_VAR,
  LIFERAY_GROUPID_VAR,
  LIFERAY_HOST_VAR,
  LIFERAY_USERNAME_VAR
} = require('../../utils/constants');

module.exports = class extends AuthGenerator {
  /**
   * @param {any} args
   * @param {any} options
   */
  constructor(args, options) {
    super(args, options);
    this.argument(IMPORT_WATCH_VAR, { type: String, required: false });
  }

  /**
   * @inheritdoc
   */
  async asking() {
    await super.asking();

    if (this._getValue(IMPORT_WATCH_VAR)) {
      await this._watchChanges();
    } else {
      await this._importProject();
    }
  }

  /**
   * Performs a project import
   * @return {Promise<void>} Promise resolved when import has finished
   */
  _importProject() {
    const groupId = this._getValue(LIFERAY_GROUPID_VAR);

    if (groupId) {
      return importProject(groupId, this.destinationPath());
    }

    return Promise.reject(new Error('GroupId not found'));
  }

  /**
   * Watches changes inside project and runs an import
   * process for any change.
   * @return {Promise<void>} Promise returned by this methos is never resolved,
   *  so you can wait for an infinite process until user cancels
   *  it.
   */
  _watchChanges() {
    const watchPath = path.resolve(this.destinationPath(), 'src');
    const host = this._getValue(LIFERAY_HOST_VAR);
    const user = this._getValue(LIFERAY_USERNAME_VAR);
    const groupId = this._getValue(LIFERAY_GROUPID_VAR);
    const companyId = this._getValue(LIFERAY_COMPANYID_VAR);

    const group = this._groupChoices.find(group => group.value === groupId);

    const company = this._companyChoices.find(
      company => company.value === companyId
    );

    if (!host || !user || !group || !company) {
      throw new Error('Unexpected error: invalid server data');
    }

    let updatePromise = Promise.resolve();
    let queuedUpdate = false;

    return new Promise(() =>
      chokidar.watch(watchPath).on('all', async () => {
        if (!queuedUpdate) {
          queuedUpdate = true;
          await updatePromise;

          // eslint-disable-next-line no-console
          console.clear();
          log(`Watching changes in ${watchPath}`);
          log('Press Ctrl+C to stop watching\n');
          log('Host', { data: host });
          log('User', { data: user });
          log('Company', { data: company.name });
          log('Group', { data: group.name });

          queuedUpdate = false;
          updatePromise = this._importProject();
        }
      })
    );
  }
};
