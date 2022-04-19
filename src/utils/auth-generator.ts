import { IChoice } from 'yeoman-generator-types';

import api from './api';
import CustomGenerator from './custom-generator';
import getSiteGroups from './get-site-groups';

const LIFERAY_COMPANYID_VAR = 'companyId';
const LIFERAY_GROUPID_VAR = 'groupId';
const LIFERAY_HOST_VAR = 'host';
const LIFERAY_PASSWORD_VAR = 'password';
const LIFERAY_USERNAME_VAR = 'username';

export default class AuthGenerator extends CustomGenerator {
  private _groupChoices: IChoice[];
  private _companyChoices: IChoice[];

  constructor(args: any, options: any) {
    super(args, options);

    this._groupChoices = [];
    this._companyChoices = [];

    this.argument(LIFERAY_HOST_VAR, { type: String, required: false });
    this.argument(LIFERAY_USERNAME_VAR, { type: String, required: false });
    this.argument(LIFERAY_PASSWORD_VAR, { type: String, required: false });
    this.argument(LIFERAY_GROUPID_VAR, { type: String, required: false });
  }

  async asking(): Promise<void> {
    await this._askHostData();
    await this._askSiteData();
  }

  getCompany(): IChoice | undefined {
    const companyId = this.getCompanyId();

    return this._companyChoices.find((company) => company.value === companyId);
  }

  getCompanyId(): string | undefined {
    return this.getValue(LIFERAY_COMPANYID_VAR);
  }

  getGroup(): IChoice | undefined {
    const groupId = this.getGroupId();

    return this._groupChoices.find((group) => group.value === groupId);
  }

  getGroupId(): string | undefined {
    return this.getValue(LIFERAY_GROUPID_VAR);
  }

  getHost(): string | undefined {
    return this.getValue(LIFERAY_HOST_VAR);
  }

  getUsername(): string | undefined {
    return this.getValue(LIFERAY_USERNAME_VAR);
  }

  private static _checkConnection() {
    return api.checkAuthentication();
  }

  private static async _getCompanyChoices() {
    try {
      return (await api.getCompanies()).map((company) => ({
        name: company.webId,
        value: company.companyId,
      }));
    } catch (_) {
      throw new Error('Unable to get site companies');
    }
  }

  private async _askHostData() {
    this.setDefaultValue(LIFERAY_HOST_VAR, 'http://localhost:8080');
    this.setDefaultValue(LIFERAY_USERNAME_VAR, 'test@liferay.com');
    this.setDefaultValue(LIFERAY_PASSWORD_VAR, 'test');

    await this.ask([
      {
        type: 'input',
        name: LIFERAY_HOST_VAR,
        message: 'Liferay host & port',
        default: this.getValue(LIFERAY_HOST_VAR),
        when: !this.hasOption(LIFERAY_HOST_VAR),
        store: true,
      },
      {
        type: 'input',
        name: LIFERAY_USERNAME_VAR,
        message: 'Username',
        default: this.getValue(LIFERAY_USERNAME_VAR),
        when: !this.hasOption(LIFERAY_USERNAME_VAR),
        store: true,
      },
      {
        type: 'password',
        name: LIFERAY_PASSWORD_VAR,
        message: 'Password',
        default: this.getValue(LIFERAY_PASSWORD_VAR),
        when: !this.hasOption(LIFERAY_PASSWORD_VAR),
      },
    ]);

    this.logMessage('Checking connection...', { newLine: true });

    try {
      await this._wrapApi();
      await AuthGenerator._checkConnection();
      this.logMessage('Connection successful\n', { level: 'success' });
    } catch (error) {
      this.logMessage(
        'Connection unsuccessful,\n' +
          'please check your host information.\n\n' +
          `${error instanceof Error ? error.toString() : error}\n`,
        { level: 'error' }
      );

      this.deleteOption(LIFERAY_HOST_VAR);
      this.deleteOption(LIFERAY_USERNAME_VAR);
      this.deleteOption(LIFERAY_PASSWORD_VAR);
      this.deleteOption(LIFERAY_GROUPID_VAR);

      await this._askHostData();
    }
  }

  private async _askSiteData() {
    if (!this.hasOption(LIFERAY_GROUPID_VAR)) {
      this._companyChoices = await AuthGenerator._getCompanyChoices();

      await this.ask([
        {
          type: 'list',
          name: LIFERAY_COMPANYID_VAR,
          message: 'Company ID',
          choices: this._companyChoices,
          default: this.getCompanyId(),
          store: true,
        },
      ]);

      this._groupChoices = await this._getGroupChoices();

      await this.ask([
        {
          type: 'list',
          name: LIFERAY_GROUPID_VAR,
          message: 'Group ID',
          choices: this._groupChoices,
          default: this.getValue(LIFERAY_GROUPID_VAR),
          store: true,
        },
      ]);
    }
  }

  private async _getGroupChoices() {
    const companyId = this.getCompanyId();

    if (companyId) {
      try {
        return (await getSiteGroups(companyId)).map((group) => ({
          name: group.descriptiveName,
          value: group.groupId,
        }));
      } catch (_) {
        throw new Error('Unable to get groups');
      }
    }

    return [];
  }

  private async _wrapApi() {
    const host = this.getValue(LIFERAY_HOST_VAR) || '';
    const user = this.getValue(LIFERAY_USERNAME_VAR) || '';
    const pass = this.getValue(LIFERAY_PASSWORD_VAR) || '';
    const base64Token = Buffer.from(`${user}:${pass}`).toString('base64');

    api.init(host, base64Token);

    try {
      api.init(host, base64Token, await api.getOAuthToken(user, pass));
    } catch (_) {}
  }
}
