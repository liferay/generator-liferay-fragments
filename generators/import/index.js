const chokidar = require('chokidar');
const path = require('path');
const AuthGenerator = require('../../utils/auth-generator');
const getProjectContent = require('../../utils/get-project-content');
const importProject = require('./import');
const { log, logData } = require('../../utils/log');

const {
  IMPORT_WATCH_VAR,
  LIFERAY_COMPANYID_VAR,
  LIFERAY_GROUPID_VAR,
  LIFERAY_HOST_VAR,
  LIFERAY_USERNAME_VAR
} = require('../../utils/constants');

module.exports = class extends AuthGenerator {
  constructor(...args) {
    super(...args);
    this.argument(IMPORT_WATCH_VAR, { type: Boolean, required: false });
  }

  /**
   * @inheritdoc
   */
  async asking() {
    await super.asking();

    if (this.getValue(IMPORT_WATCH_VAR)) {
      await this._watchChanges();
    } else {
      await this._importProject();
    }
  }

  /**
   * Performs a project import
   * @return {Promise} Promise resolved when import has finished
   */
  _importProject() {
    return importProject(
      this._api,
      this.getValue(LIFERAY_GROUPID_VAR),
      getProjectContent(this.destinationPath())
    );
  }

  /**
   * Watches changes inside project and runs an import
   * process for any change.
   * @return {Promise} Promise returned by this methos is never resolved,
   *  so you can wait for an infinite process until user cancels
   *  it.
   */
  _watchChanges() {
    const watchPath = path.resolve(this.destinationPath(), 'src');
    const host = this.getValue(LIFERAY_HOST_VAR);
    const user = this.getValue(LIFERAY_USERNAME_VAR);
    const groupId = this.getValue(LIFERAY_GROUPID_VAR);
    const group = this._groupChoices.find(group => group.value === groupId);
    const companyId = this.getValue(LIFERAY_COMPANYID_VAR);
    const company = this._companyChoices.find(
      company => company.value === companyId
    );

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
          logData('Host', host);
          logData('User', user);
          logData('Company', company.name);
          logData('Group', group.name);

          queuedUpdate = false;
          updatePromise = this._importProject();
        }
      })
    );
  }
};
