const { default: AuthGenerator } = require('../utils/auth-generator');
const exportProject = require('./export');

module.exports = class extends AuthGenerator {
  /**
   * @inheritdoc
   */
  async asking() {
    await super.asking();
    const groupId = this.getGroupId();

    if (!groupId) {
      throw new Error('groupId cannot be undefined');
    }

    await exportProject(groupId, this.destinationPath());
  }
};
