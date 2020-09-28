export interface IProject {
  basePath: string;
  project: {
    name: string;
  };
  collections: ICollection[];
  pageTemplates?: IPageTemplate[];
}

export interface ICollectionMetadata {
  name: string;
  description: string;
}

export interface ICollection {
  slug: string;
  fragmentCollectionId: string;
  metadata: ICollectionMetadata;
  fragmentCompositions?: IFragmentComposition[];
  fragments: IFragment[];
}

export interface IFragmentCompositionMetadata {
  fragmentCompositionDefinitionPath: string;
  name: string;
}

export interface IFragmentComposition {
  slug: string;
  metadata: IFragmentCompositionMetadata;
  definitionData: string;
}

export interface ICollectionRequest {
  collection: ICollection;
  existingCollection: IServerCollection | undefined;
  promise: Promise<void> | undefined;
  status: 'error' | 'pending' | 'success';
  error: Error | undefined;
}

export type IFragmentRequestStatus =
  | 'pending'
  | 'added'
  | 'updated'
  | 'upToDate'
  | 'ignored'
  | 'error';

export interface IFragmentRequest {
  collection: ICollection;
  fragment: IFragment;
  existingFragment: IServerFragment | undefined;
  promise: Promise<void> | undefined;
  status: IFragmentRequestStatus;
  error: Error | undefined;
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

export interface IFragmentMetadata {
  cssPath: string;
  htmlPath: string;
  jsPath: string;
  configurationPath?: string;
  thumbnailPath?: string;
  name: string;
  type: 'component' | 'section';
}

export interface IFragment {
  slug: string;
  metadata: IFragmentMetadata;
  css: string;
  html: string;
  js: string;
  configuration: string;
  thumbnail?: Buffer;

  unknownFiles: Array<{
    filePath: string;
    content: Buffer;
  }>;
}

export interface ICompany {
  webId: string;
  companyId: string;
}

export interface IPageTemplateMetadata {
  pageTemplateDefinitionPath: string;
  name: string;
}

export interface IPageTemplate {
  slug: string;
  metadata: IPageTemplateMetadata;
  definitionData: string;
}

export interface ISiteGroup {
  descriptiveName: string;
  groupId: string;
  liveGroupId: string;
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
  configuration: string;
  previewFileEntryId: string;
}

export interface IServerFragmentComposition {
  fragmentCompositionKey: string;
  data: string;
  name: string;
}

export interface IGetFragmentEntriesOptions {
  groupId: string;
  fragmentCollectionId: string;
  status: number;
  start: -1;
  end: -1;
  name?: string;
}
