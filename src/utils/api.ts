import FormData, { SubmitOptions } from 'form-data';
import fs from 'fs';
import JSZip from 'jszip';
import mime from 'mime-types';
import request from 'request';
import { parse as parseUrl } from 'url';
import util from 'util';

import {
  ICompany,
  IGetFragmentEntriesOptions,
  IServerCollection,
  IServerFragment,
  IServerFragmentComposition,
  IServerOauthToken,
  ISiteGroup,
} from '../../types';
import { FRAGMENTS_PORTLET_ID, PORTLET_FILE_REPOSITORY } from './constants';
import { createTemporaryFile } from './temporary';
import writeZip from './write-zip';

const api = {
  _host: '',
  _basicAuthToken: '',

  _oauthToken: {
    accessToken: '',
    refreshToken: '',
    expirationDate: new Date('1991-1-1'),
  },

  init(
    host: string,
    basicAuthToken: string,
    oauthToken?: IServerOauthToken
  ): void {
    this._host = host;
    this._basicAuthToken = basicAuthToken;

    if (oauthToken) {
      const expirationDate = new Date();
      expirationDate.setSeconds(
        expirationDate.getSeconds() + oauthToken.expires_in - 60
      );

      this._oauthToken = {
        accessToken: oauthToken.access_token,
        refreshToken: oauthToken.refresh_token,
        expirationDate,
      };
    }
  },

  async request<T = Record<string, any> | string>(
    method: 'GET' | 'POST',
    url: string,
    options: Record<string, any> = {}
  ): Promise<T> {
    if (process.env.NODE_ENV === 'test') {
      throw new Error(
        `Requests not available during testing (${method} ${url})`
      );
    }

    const promiseRequest = util.promisify(request);
    const opts = {
      method,
      url: `${this._host}${url}`,
      ...options,
    };

    return this.parseResponse<T>(
      (await promiseRequest(opts, undefined)) as {
        statusCode: number;
        body: Record<string, any> | string;
      }
    );
  },

  parseResponse<T = Record<string, any> | string>(response: {
    statusCode: number;
    body: Record<string, any> | string;
  }): T {
    let responseBody = response.body;

    if (typeof responseBody === 'string') {
      try {
        responseBody = JSON.parse(responseBody);
      } catch (_) {
        // If responseBody is not an object
        // we silently ignore
      }
    }

    if (typeof responseBody === 'object') {
      if (responseBody.error && responseBody.error.type) {
        const errorMessage = responseBody.error.message;
        let message = '';

        switch (responseBody.error.type) {
          case 'com.liferay.fragment.exception.FragmentEntryNameException':
            message = `Error in fragment.json: ${errorMessage}`;
            break;
          case 'com.liferay.fragment.exception.FragmentCollectionNameException':
            message = `Error in collection.json: ${errorMessage}`;
            break;
          case 'com.liferay.fragment.exception.FragmentEntryConfigurationException':
            message = `Error in fragment configuration:\n${errorMessage}`;
            break;
          case 'com.liferay.fragment.exception.DuplicateFragmentEntryKeyException':
            message =
              'Error in fragment.json: There is already a fragment with the same name';
            break;
          default:
            message = errorMessage;
            break;
        }

        if (message) {
          throw new Error(message);
        }
      }

      if ('exception' in responseBody) {
        throw new Error(responseBody.exception);
      }

      if ('error' in responseBody) {
        throw new Error(responseBody.error);
      }
    }

    if (response.statusCode >= 400) {
      throw new Error(`${response.statusCode} ${response.body}`);
    }

    return responseBody as T;
  },

  get<T>(
    url: string,
    queryParameters: Record<string, string> = {},
    options: Record<string, any> = {}
  ): Promise<T> {
    const queryString = Object.entries(queryParameters)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return this.request('GET', `${url}?${queryString}`, options);
  },

  postForm<T>(
    url: string,
    form: Record<string, any>,
    options?: Record<string, any>
  ): Promise<T> {
    return this.request('POST', url, { form, ...options });
  },

  postFormData<T>(
    url: string,
    formData: Record<string, any>,
    options: Record<string, any> = {}
  ): Promise<T> {
    return this.request('POST', url, { formData, ...options });
  },

  getOAuthToken(
    username: string,
    password: string
  ): Promise<IServerOauthToken> {
    return this.postForm('/o/oauth2/token', {
      grant_type: 'password', // eslint-disable-line camelcase
      client_id: 'FragmentRenderer', // eslint-disable-line camelcase
      username,
      password,
    });
  },

  async refreshOAuthToken(): Promise<void> {
    if (this._oauthToken.expirationDate < new Date()) {
      try {
        const oauthToken = await this.postForm<IServerOauthToken>(
          '/o/oauth2/token',
          {
            client_id: 'FragmentRenderer', // eslint-disable-line camelcase
            grant_type: 'refresh_token', // eslint-disable-line camelcase
            refresh_token: this._oauthToken.refreshToken, // eslint-disable-line camelcase
          }
        );

        this.init(this._host, this._basicAuthToken, oauthToken);
      } catch (_) {
        this._oauthToken = {
          accessToken: '',
          refreshToken: '',
          expirationDate: new Date('1991-1-1'),
        };
      }
    }
  },

  async checkAuthentication(): Promise<void> {
    await this.postFormData(
      '/api/jsonws/user/get-current-user',
      {},
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    );

    if (this._oauthToken.accessToken) {
      await this.postFormData(
        '/api/jsonws/user/get-current-user',
        {},
        {
          headers: { Authorization: `Bearer ${this._oauthToken.accessToken}` },
        }
      );
    }
  },

  getCompanies(): Promise<ICompany[]> {
    return this.postFormData(
      '/api/jsonws/company/get-companies',
      {},
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    );
  },

  getStagingGroups(companyId: string): Promise<ISiteGroup[]> {
    return this.postFormData(
      `/api/jsonws/group/get-groups/company-id/${companyId}/parent-group-id/0/site/false`,
      {},
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    );
  },

  getSiteGroups(companyId: string): Promise<ISiteGroup[]> {
    return this.postFormData(
      `/api/jsonws/group/get-groups/company-id/${companyId}/parent-group-id/0/site/true`,
      {},
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    );
  },

  getFragmentEntries(
    groupId: string,
    fragmentCollectionId: string,
    name?: string
  ): Promise<IServerFragment[]> {
    const formData: IGetFragmentEntriesOptions = {
      groupId,
      fragmentCollectionId,
      status: 0,
      start: -1,
      end: -1,
    };

    if (name) {
      formData.name = name;
    }

    return this.postFormData(
      '/api/jsonws/fragment.fragmententry/get-fragment-entries',
      formData,
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    );
  },

  getFragmentCompositions(
    groupId: string,
    fragmentCollectionId: string
  ): Promise<IServerFragmentComposition[]> {
    const formData = {
      groupId,
      fragmentCollectionId,
      start: -1,
      end: -1,
    };

    return this.postFormData<IServerFragmentComposition[]>(
      '/api/jsonws/fragment.fragmentcomposition/get-fragment-compositions',
      formData,
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    ).catch(() => {
      return [];
    });
  },

  getFragmentCollections(
    groupId: string,
    name?: string
  ): Promise<IServerCollection[]> {
    const formData: {
      groupId: string;
      start: number;
      end: number;
      name?: string;
    } = {
      groupId,
      start: -1,
      end: -1,
    };

    if (name) {
      formData.name = name;
    }

    return this.postFormData(
      '/api/jsonws/fragment.fragmentcollection/get-fragment-collections',
      formData,
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    );
  },

  updateFragmentCollection(
    fragmentCollectionId: string,
    name: string,
    description = ''
  ): Promise<void> {
    return this.postFormData(
      '/api/jsonws/fragment.fragmentcollection/update-fragment-collection',
      {
        fragmentCollectionId,
        description,
        name,
      },
      {
        headers: {
          Authorization: `Basic ${this._basicAuthToken}`,
        },
      }
    );
  },

  addFragmentCollection(
    groupId: string,
    fragmentCollectionKey: string,
    name: string,
    description = ''
  ): Promise<void> {
    return this.postFormData(
      '/api/jsonws/fragment.fragmentcollection/add-fragment-collection',
      {
        groupId,
        fragmentCollectionKey,
        name,
        description,
      },
      {
        headers: {
          Authorization: `Basic ${this._basicAuthToken}`,
        },
      }
    );
  },

  updateFragmentEntry(
    fragmentEntryId: string,
    {
      configuration,
      css,
      html,
      js,
      name,
      previewFileEntryId = 0,
      status,
    }: {
      configuration: string;
      css: string;
      html: string;
      js: string;
      name: string;
      previewFileEntryId?: number;
      status: number;
    }
  ): Promise<void> {
    return this.postFormData(
      '/api/jsonws/fragment.fragmententry/update-fragment-entry',
      {
        fragmentEntryId,
        status,
        name,
        html,
        css,
        js,
        configuration,
        previewFileEntryId,
      },
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    );
  },

  async uploadThumbnail(
    thumbnail: Buffer,
    groupId: string,
    fragmentEntryKey: string,
    previewFileEntryId = '0'
  ): Promise<number> {
    const bytes = JSON.stringify([...thumbnail]);
    const filename = `${groupId}_${fragmentEntryKey}_thumbnail`;

    let fileEntry: number;

    const repository = await this.postFormData<{
      repositoryId: string;
      dlFolderId: string;
    }>(
      '/api/jsonws/repository/get-repository',
      {
        groupId,
        portletId: FRAGMENTS_PORTLET_ID,
      },
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    )
      .then((response) => response)
      .catch(async () => {
        const classNameId = await this.postFormData<{ classNameId: string }>(
          '/api/jsonws/classname/fetch-class-name',
          {
            value: PORTLET_FILE_REPOSITORY,
          },
          {
            headers: { Authorization: `Basic ${this._basicAuthToken}` },
          }
        ).then((response) => response.classNameId);

        return this.postFormData<{
          repositoryId: string;
          dlFolderId: string;
        }>(
          '/api/jsonws/repository/add-repository',
          {
            groupId,
            classNameId,
            parentFolderId: 0,
            name: FRAGMENTS_PORTLET_ID,
            description: '',
            portletId: FRAGMENTS_PORTLET_ID,
            typeSettingsProperties: JSON.stringify({}),
          },
          {
            headers: { Authorization: `Basic ${this._basicAuthToken}` },
          }
        ).then((response) => response);
      });

    if (Number(previewFileEntryId) > 0) {
      fileEntry = await this.postFormData<{ fileEntryId: number }>(
        '/api/jsonws/dlapp/update-file-entry',
        {
          fileEntryId: previewFileEntryId,
          sourceFileName: filename,
          mimeType: mime.lookup(filename),
          title: filename,
          description: '',
          changeLog: '',
          dlVersionNumberIncrease: 'NONE',
          bytes,
        },
        {
          headers: { Authorization: `Basic ${this._basicAuthToken}` },
        }
      ).then((response) => response.fileEntryId);
    } else {
      fileEntry = await this.postFormData<{ fileEntryId: number }>(
        '/api/jsonws/dlapp/add-file-entry',
        {
          repositoryId: repository.repositoryId,
          folderId: repository.dlFolderId,
          sourceFileName: filename,
          mimeType: mime.lookup(filename),
          title: filename,
          description: '',
          changeLog: '',
          bytes,
        },
        {
          headers: { Authorization: `Basic ${this._basicAuthToken}` },
        }
      ).then((response) => response.fileEntryId);
    }

    return fileEntry;
  },

  addFragmentEntry(
    groupId: string,
    fragmentCollectionId: string,
    fragmentEntryKey: string,
    {
      configuration,
      css,
      html,
      js,
      name,
      previewFileEntryId = 0,
      status,
      type,
    }: {
      configuration: string;
      css: string;
      html: string;
      js: string;
      name: string;
      previewFileEntryId?: number;
      status: number;
      type: number;
    }
  ): Promise<IServerFragment> {
    return this.postFormData(
      '/api/jsonws/fragment.fragmententry/add-fragment-entry',
      {
        fragmentCollectionId,
        fragmentEntryKey,
        groupId,
        status,
        name,
        type,
        html,
        css,
        js,
        configuration,
        previewFileEntryId,
      },
      {
        headers: { Authorization: `Basic ${this._basicAuthToken}` },
      }
    );
  },

  async exportZip(groupId: string): Promise<Buffer> {
    await this.refreshOAuthToken();

    return new Promise((resolve, reject) => {
      request(
        `${this._host}/c/portal/layout_page_template/export_layout_page_template_entries?groupId=${groupId}`,
        {
          headers: { Authorization: `Bearer ${this._oauthToken.accessToken}` },
          encoding: null,
        },
        (error, response, body) => {
          if (error) {
            reject(error);
          }

          resolve(body);
        }
      );
    });
  },

  async importZip(zip: JSZip, groupId: string): Promise<Record<string, any>> {
    await this.refreshOAuthToken();

    const formData = new FormData();
    const tmpZip = createTemporaryFile();

    await writeZip(zip, tmpZip.name);

    formData.append('file', fs.createReadStream(tmpZip.name));
    formData.append('groupId', groupId);

    const params = parseUrl(
      `${this._host}/c/portal/fragment/import_fragment_entries`
    );

    const options = {
      host: params.hostname,
      path: params.pathname,
      port: params.port,
      protocol: params.protocol,
      headers: { Authorization: `Bearer ${this._oauthToken.accessToken}` },
      method: 'POST',
    };

    return new Promise((resolve, reject) => {
      formData.submit(options as SubmitOptions, (error, response) => {
        tmpZip.removeCallback();

        if (error) {
          reject(error);
        } else if (
          !response.statusCode ||
          response.statusCode < 200 ||
          response.statusCode >= 300
        ) {
          reject(new Error('statusCode=' + response.statusCode));
        } else {
          let body: Buffer[] = [];

          response.on('data', (chunk: Buffer) => {
            body.push(chunk);
          });

          response.on('end', () => {
            try {
              body = JSON.parse(Buffer.concat(body).toString());
            } catch (e) {
              reject(e);

              return;
            }

            resolve((body as unknown) as Record<string, any>);
          });
        }
      });
    });
  },

  async renderCompositionPreview(
    groupId: string,
    definition: Record<string, any>
  ): Promise<string> {
    return this.renderPageDefinitionPreview(groupId, {
      pageElement: definition,
    });
  },

  async renderFragmentPreview(
    groupId: string,
    html: string,
    css: string,
    js: string,
    configuration: string
  ): Promise<string> {
    await this.refreshOAuthToken();

    return this.postFormData(
      '/c/portal/fragment/render_fragment_entry',
      {
        groupId,
        html,
        css,
        js,
        configuration,
      },
      {
        headers: { Authorization: `Bearer ${this._oauthToken.accessToken}` },
      }
    );
  },

  async renderPageDefinitionPreview(
    groupId: string,
    definition: Record<string, any>
  ): Promise<string> {
    return this.request(
      'POST',
      `/o/headless-admin-content/v1.0/sites/${groupId}/page-definitions/preview`,
      {
        body: definition,
        headers: {
          Accept: 'text/html',
          Authorization: `Basic ${this._basicAuthToken}`,
        },
        json: true,
      }
    );
  },
};

export default api;
