const api = require('./api');
const CustomGenerator = require('./custom-generator');
const getSiteGroups = require('./get-site-groups');
const { log, logNewLine, logError } = require('./log');

const {
  LIFERAY_COMPANYID_MESSAGE,
  LIFERAY_COMPANYID_VAR,
  LIFERAY_GROUPID_MESSAGE,
  LIFERAY_GROUPID_VAR,
  LIFERAY_HOST_DEFAULT,
  LIFERAY_HOST_MESSAGE,
  LIFERAY_HOST_VAR,
  LIFERAY_PASSWORD_DEFAULT,
  LIFERAY_PASSWORD_MESSAGE,
  LIFERAY_PASSWORD_VAR,
  LIFERAY_USERNAME_DEFAULT,
  LIFERAY_USERNAME_MESSAGE,
  LIFERAY_USERNAME_VAR
} = require('./constants');

module.exports = class AuthGenerator extends CustomGenerator {
  /**
   * @param {any} args
   * @param {any} options
   */
  constructor(args, options) {
    super(args, options);

    /** @type {import('yeoman-generator-types').IChoice[]} */
    this._groupChoices = [];

    /** @type {import('yeoman-generator-types').IChoice[]} */
    this._companyChoices = [];

    this.argument(LIFERAY_HOST_VAR, {
      type: String,
      required: false
    });

    this.argument(LIFERAY_USERNAME_VAR, {
      type: String,
      required: false
    });

    this.argument(LIFERAY_PASSWORD_VAR, {
      type: String,
      required: false
    });

    this.argument(LIFERAY_GROUPID_VAR, {
      type: String,
      required: false
    });
  }

  /**
   * @inheritdoc
   */
  async asking() {
    await this._askHostData();
    await this._askSiteData();
  }

  /**
   * Requests host information and tries to connect
   */
  async _askHostData() {
    this.setValue(LIFERAY_HOST_VAR, LIFERAY_HOST_DEFAULT);
    this.setValue(LIFERAY_USERNAME_VAR, LIFERAY_USERNAME_DEFAULT);
    this.setValue(LIFERAY_PASSWORD_VAR, LIFERAY_PASSWORD_DEFAULT);

    await this.ask([
      {
        type: 'input',
        name: LIFERAY_HOST_VAR,
        message: LIFERAY_HOST_MESSAGE,
        default: this.getValue(LIFERAY_HOST_VAR),
        when: !(LIFERAY_HOST_VAR in this.options),
        store: true
      },
      {
        type: 'input',
        name: LIFERAY_USERNAME_VAR,
        message: LIFERAY_USERNAME_MESSAGE,
        default: this.getValue(LIFERAY_USERNAME_VAR),
        when: !(LIFERAY_USERNAME_VAR in this.options),
        store: true
      },
      {
        type: 'password',
        name: LIFERAY_PASSWORD_VAR,
        message: LIFERAY_PASSWORD_MESSAGE,
        default: this.getValue(LIFERAY_PASSWORD_VAR),
        when: !(LIFERAY_PASSWORD_VAR in this.options)
      }
    ]);

    logNewLine('Checking connection...');

    try {
      await this._wrapApi();
      await this._checkConnection();
      log('Connection successful\n');
    } catch (error) {
      logError(
        'Connection unsuccessful,\n' +
          'please check your host information.\n\n' +
          `${error.toString()}\n`
      );

      delete this.options[LIFERAY_HOST_VAR];
      delete this.options[LIFERAY_USERNAME_VAR];
      delete this.options[LIFERAY_PASSWORD_VAR];
      delete this.options[LIFERAY_GROUPID_VAR];

      await this._askHostData();
    }
  }

  /**
   * Request site information
   */
  async _askSiteData() {
    if (!(LIFERAY_GROUPID_VAR in this.options)) {
      this._companyChoices = await this._getCompanyChoices();

      await this.ask([
        {
          type: 'list',
          name: LIFERAY_COMPANYID_VAR,
          message: LIFERAY_COMPANYID_MESSAGE,
          choices: this._companyChoices,
          default: this.getValue(LIFERAY_COMPANYID_VAR),
          store: true
        }
      ]);

      this._groupChoices = await this._getGroupChoices();

      await this.ask([
        {
          type: 'list',
          name: LIFERAY_GROUPID_VAR,
          message: LIFERAY_GROUPID_MESSAGE,
          choices: this._groupChoices,
          default: this.getValue(LIFERAY_GROUPID_VAR),
          store: true
        }
      ]);
    }
  }

  /**
   * Tests connection with liferay server
   * @return {Promise<void>}
   */
  _checkConnection() {
    return api.checkAuthentication();
  }

  /**
   * Return a list of companies
   * @return {Promise<import('yeoman-generator-types').IChoice[]>} List of choices
   */
  async _getCompanyChoices() {
    try {
      return (await api.getCompanies()).map(company => ({
        name: company.webId,
        value: company.companyId
      }));
    } catch (error) {
      throw new Error('Unable to get site companies');
    }
  }

  /**
   * Return a list of companies
   * @return {Promise<import('yeoman-generator-types').IChoice[]>} List of choices
   */
  async _getGroupChoices() {
    const companyId = this.getValue(LIFERAY_COMPANYID_VAR);

    if (companyId) {
      try {
        return (await getSiteGroups(companyId)).map(group => ({
          name: group.descriptiveName,
          value: group.groupId
        }));
      } catch (error) {
        throw new Error('Unable to get groups');
      }
    }

    return [];
  }

  /**
   * Wraps API calls with current host and user information
   */
  async _wrapApi() {
    const host = this.getValue(LIFERAY_HOST_VAR) || '';
    const user = this.getValue(LIFERAY_USERNAME_VAR) || '';
    const pass = this.getValue(LIFERAY_PASSWORD_VAR) || '';
    const base64Token = Buffer.from(`${user}:${pass}`).toString('base64');

    api.init(host, base64Token);

    try {
      api.init(host, base64Token, await api.getOAuthToken(user, pass));
    } catch (error) {}
  }
};
