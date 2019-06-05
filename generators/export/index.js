const AuthGenerator = require('../../utils/auth-generator');
const getProjectContent = require('../../utils/get-project-content');
const exportCollections = require('./export');
const writeProjectContent = require('../../utils/write-project-content');
const { LIFERAY_GROUPID_VAR } = require('../../utils/constants');

module.exports = class extends AuthGenerator {
  /**
   * @inheritdoc
   */
  async asking() {
    await super.asking();
    const projectContent = getProjectContent(this.destinationPath());

    projectContent.collections = await exportCollections(
      this._api,
      this.getValue(LIFERAY_GROUPID_VAR),
      projectContent
    );

    writeProjectContent(projectContent.basePath, projectContent);
  }
};
