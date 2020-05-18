const AuthGenerator = require('../../utils/auth-generator');
const { LIFERAY_GROUPID_VAR } = require('../../utils/constants');
const exportProject = require('./export');

module.exports = class extends AuthGenerator {
  /**
   * @inheritdoc
   */
  async asking() {
    await super.asking();
    const groupId = this._getValue(LIFERAY_GROUPID_VAR);

    if (!groupId) {
      throw new Error('groupId cannot be undefined');
    }

    await exportProject(groupId, this.destinationPath());
  }
};
