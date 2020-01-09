const compress = require('./compress');
const CustomGenerator = require('../../utils/custom-generator');

const {
  ADD_DEPLOYMENT_DESCRIPTOR_DEFAULT,
  ADD_DEPLOYMENT_DESCRIPTOR_MESSAGE,
  ADD_DEPLOYMENT_DESCRIPTOR_VAR,
  DEPLOYMENT_DESCRIPTOR_COMPANY_DEFAULT,
  DEPLOYMENT_DESCRIPTOR_COMPANY_MESSAGE,
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_DEFAULT,
  DEPLOYMENT_DESCRIPTOR_GROUP_MESSAGE,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR
} = require('../../utils/constants');

module.exports = class extends CustomGenerator {
  /**
   * @inheritdoc
   */
  async prompting() {
    await this._ask([
      {
        type: 'confirm',
        name: ADD_DEPLOYMENT_DESCRIPTOR_VAR,
        message: ADD_DEPLOYMENT_DESCRIPTOR_MESSAGE,
        default: ADD_DEPLOYMENT_DESCRIPTOR_DEFAULT
      }
    ]);

    if (this.answers[ADD_DEPLOYMENT_DESCRIPTOR_VAR]) {
      await this._ask([
        {
          type: 'input',
          name: DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
          message: DEPLOYMENT_DESCRIPTOR_COMPANY_MESSAGE,
          default: DEPLOYMENT_DESCRIPTOR_COMPANY_DEFAULT
        }
      ]);

      if (
        this.answers[DEPLOYMENT_DESCRIPTOR_COMPANY_VAR] &&
        this.answers[DEPLOYMENT_DESCRIPTOR_COMPANY_VAR] !== '' &&
        this.answers[DEPLOYMENT_DESCRIPTOR_COMPANY_VAR] !== '*'
      ) {
        await this._ask([
          {
            type: 'input',
            name: DEPLOYMENT_DESCRIPTOR_GROUP_VAR,
            message: DEPLOYMENT_DESCRIPTOR_GROUP_MESSAGE,
            default: DEPLOYMENT_DESCRIPTOR_GROUP_DEFAULT
          }
        ]);
      }
    }
  }

  /**
   * @inheritdoc
   */
  async writting() {
    await compress(this.destinationPath(), this.answers);
  }
};
