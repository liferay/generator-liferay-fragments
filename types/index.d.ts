export interface IProject {
  basePath: string;
  project: {
    name: string;
  };
  collections: ICollection[];
}

export interface ICollection {
  slug: string;
  fragmentCollectionId: string;
  metadata: {
    name: string;
    description: string;
  };
  fragments: IFragment[];
}

export interface IServerOauthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
}

export interface IOauthToken {
  accessToken: string;
  refreshToken: string;
  expirationDate: Date;
}

export interface IFragment {
  slug: string;
  metadata: {
    cssPath: string;
    htmlPath: string;
    jsPath: string;
    name: string;
    type: string;
  };
  css: string;
  html: string;
  js: string;
}

export interface ICompany {
  webId: string;
  companyId: string;
}

export interface ISiteGroup {
  descriptiveName: string;
  groupId: string;
}

export interface IServerCollection {
  fragmentCollectionId: string;
  fragmentCollectionKey: string;
  name: string;
  description: string;
}

export interface IServerFragment {
  fragmentEntryId: string;
  fragmentEntryKey: string;
  type: string;
  name: string;
  html: string;
  css: string;
  js: string;
}

export interface IGetFragmentEntriesOptions {
  groupId: string;
  fragmentCollectionId: string;
  status: number;
  start: -1;
  end: -1;
  name?: string;
}
