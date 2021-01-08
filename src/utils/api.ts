import FormData from 'form-data';
import fs from 'fs';
import JSZip from 'jszip';
import mime from 'mime-types';
import fetch, { RequestInit, Response } from 'node-fetch';

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

interface CustomOptions {
  auth?: 'oauth' | 'basic';
}

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

  getOAuthToken(
    username: string,
    password: string
  ): Promise<IServerOauthToken> {
    return this._request<IServerOauthToken>('/o/oauth2/token', {
      method: 'POST',

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },

      body: [
        'grant_type=password',
        'client_id=FragmentRenderer',
        `username=${username}`,
        `password=${password}`,
      ].join('&'),
    });
  },

  async checkAuthentication(): Promise<void> {
    await this._request('/api/jsonws/user/get-current-user', {
      method: 'POST',
      auth: 'basic',
    });

    if (this._oauthToken.accessToken) {
      await this._request('/api/jsonws/user/get-current-user', {
        method: 'POST',
        auth: 'oauth',
      });
    }
  },

  getCompanies(): Promise<ICompany[]> {
    return this._request('/api/jsonws/company/get-companies', {
      method: 'POST',
      auth: 'basic',
    });
  },

  getStagingGroups(companyId: string): Promise<ISiteGroup[]> {
    return this._request(
      `/api/jsonws/group/get-groups/company-id/${companyId}/parent-group-id/0/site/false`,
      {
        method: 'POST',
        auth: 'basic',
      }
    );
  },

  getSiteGroups(companyId: string): Promise<ISiteGroup[]> {
    return this._request(
      `/api/jsonws/group/get-groups/company-id/${companyId}/parent-group-id/0/site/true`,
      {
        method: 'POST',
        auth: 'basic',
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

    return this._postMultipartFormData(
      '/api/jsonws/fragment.fragmententry/get-fragment-entries',
      formData,
      { auth: 'basic' }
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

    return this._postMultipartFormData<IServerFragmentComposition[]>(
      '/api/jsonws/fragment.fragmentcomposition/get-fragment-compositions',
      formData,
      { auth: 'basic' }
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

    return this._postMultipartFormData(
      '/api/jsonws/fragment.fragmentcollection/get-fragment-collections',
      formData,
      { auth: 'basic' }
    );
  },

  updateFragmentCollection(
    fragmentCollectionId: string,
    name: string,
    description = ''
  ): Promise<void> {
    return this._postMultipartFormData(
      '/api/jsonws/fragment.fragmentcollection/update-fragment-collection',
      {
        fragmentCollectionId,
        description,
        name,
      },
      {
        auth: 'basic',
      }
    );
  },

  addFragmentCollection(
    groupId: string,
    fragmentCollectionKey: string,
    name: string,
    description = ''
  ): Promise<void> {
    return this._postMultipartFormData(
      '/api/jsonws/fragment.fragmentcollection/add-fragment-collection',
      {
        groupId,
        fragmentCollectionKey,
        name,
        description,
      },
      {
        auth: 'basic',
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
    return this._postMultipartFormData(
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
        auth: 'basic',
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

    const repository = await this._postMultipartFormData<{
      repositoryId: string;
      dlFolderId: string;
    }>(
      '/api/jsonws/repository/get-repository',
      {
        groupId,
        portletId: FRAGMENTS_PORTLET_ID,
      },
      {
        auth: 'basic',
      }
    )
      .then((response) => response)
      .catch(async (error) => {
        if (error.message.includes('No JSON web service action')) {
          return null;
        }

        const classNameId = await this._postMultipartFormData<{
          classNameId: string;
        }>(
          '/api/jsonws/classname/fetch-class-name',
          {
            value: PORTLET_FILE_REPOSITORY,
          },
          {
            auth: 'basic',
          }
        ).then((response) => response.classNameId);

        return this._postMultipartFormData<{
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
            auth: 'basic',
          }
        ).then((response) => response);
      });

    if (!repository) {
      return -1;
    }

    if (Number(previewFileEntryId) > 0) {
      fileEntry = await this._postMultipartFormData<{ fileEntryId: number }>(
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
          auth: 'basic',
        }
      ).then((response) => response.fileEntryId);
    } else {
      fileEntry = await this._postMultipartFormData<{ fileEntryId: number }>(
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
          auth: 'basic',
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
    return this._postMultipartFormData(
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
        auth: 'basic',
      }
    );
  },

  async exportZip(groupId: string): Promise<Buffer> {
    return this._rawRequest(
      `/c/portal/layout_page_template/export_layout_page_template_entries?groupId=${groupId}`,
      { auth: 'oauth' }
    ).then((response) => response.buffer());
  },

  async importZip(
    zip: JSZip,
    groupId: string
  ): Promise<Record<string, any> | string> {
    const tmpZip = createTemporaryFile();

    await writeZip(zip, tmpZip.name);

    return this._postMultipartFormData<Record<string, any>>(
      '/c/portal/fragment/import_fragment_entries',
      {
        file: fs.readFileSync(tmpZip.name),
        groupId,
      },
      {
        auth: 'oauth',
      }
    ).finally(() => {
      tmpZip.removeCallback();
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
    return this._postMultipartFormData(
      '/c/portal/fragment/render_fragment_entry',
      {
        groupId,
        html,
        css,
        js,
        configuration,
      },
      {
        auth: 'oauth',
      }
    );
  },

  async renderPageDefinitionPreview(
    groupId: string,
    definition: Record<string, any>
  ): Promise<string> {
    return this._rawRequest(
      `/o/headless-admin-content/v1.0/sites/${groupId}/page-definitions/preview`,
      {
        method: 'POST',
        body: JSON.stringify(definition),
        headers: {
          auth: 'basic',
          Accept: 'text/html',
        },
      }
    ).then((response) => response.text());
  },

  async _rawRequest(
    url: string,
    options: RequestInit & CustomOptions
  ): Promise<Response> {
    if (process.env.NODE_ENV === 'test') {
      throw new Error(`Requests not available during testing (${url})`);
    }

    // Refresh oauth token

    if (
      this._oauthToken &&
      this._oauthToken.refreshToken &&
      this._oauthToken.expirationDate < new Date()
    ) {
      this._oauthToken = {
        accessToken: '',
        refreshToken: '',
        expirationDate: new Date('1991-1-1'),
      };

      try {
        const oauthToken = await this._postMultipartFormData<IServerOauthToken>(
          '/o/oauth2/token',
          {
            client_id: 'FragmentRenderer',
            grant_type: 'refresh_token',
            refresh_token: this._oauthToken.refreshToken,
          }
        );

        this.init(this._host, this._basicAuthToken, oauthToken);
      } catch (_) {}
    }

    // Execute request

    const fetchOptions = { ...options };

    if (fetchOptions.auth === 'basic') {
      if (!this._basicAuthToken) {
        throw new Error(
          `${url} needs basic authentication, but its not available`
        );
      }

      fetchOptions.headers = {
        ...(fetchOptions.headers || {}),
        Authorization: `Basic ${this._basicAuthToken}`,
      };
    } else if (fetchOptions.auth === 'oauth') {
      if (!this._oauthToken || !this._oauthToken.accessToken) {
        throw new Error(
          `${url} needs OAuth authentication, but its not available`
        );
      }

      fetchOptions.headers = {
        ...(fetchOptions.headers || {}),
        Authorization: `Bearer ${this._oauthToken.accessToken}`,
      };
    }

    delete fetchOptions.auth;

    return fetch(`${this._host}${url}`, fetchOptions);
  },

  async _request<T = Record<string, any> | string>(
    url: string,
    options: RequestInit & CustomOptions
  ): Promise<T> {
    const response = await this._rawRequest(url, options);

    let responseBody;

    try {
      responseBody = await response.clone().json();
    } catch (_) {
      responseBody = await response.clone().text();
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

    if (response.status >= 400) {
      throw new Error(`${response.status} ${JSON.stringify(responseBody)}`);
    }

    return responseBody as T;
  },

  _postMultipartFormData<T>(
    url: string,
    form: Record<string, any>,
    options: RequestInit & CustomOptions = {}
  ): Promise<T> {
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this._request<T>(url, {
      body: formData,
      method: 'POST',
      ...options,

      headers: {
        ...formData.getHeaders(),
        ...(options.headers || {}),
      },
    });
  },
};

export default api;
