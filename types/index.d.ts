export interface IProject {
  basePath: string;
  project: {
    name: string;
  };
  collections: ICollection[];
  pageTemplates?: IPageTemplate[];

  unknownFiles: Array<{
    filePath: string;
    content: Buffer;
  }>;
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
  resources: IResource[];
}

export interface IResource {
  filePath: string;
  content: Buffer;
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

export interface IServerOauthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
}

export interface IFragmentMetadata {
  cssPath: string;
  htmlPath: string;
  jsPath: string;
  configurationPath?: string;
  thumbnailPath?: string;
  name: string;
  type: 'component' | 'react' | 'section';
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

export type PageTemplateType =
  | 'display-page-template'
  | 'page-template'
  | 'master-page';

export interface IPageTemplateMetadata {
  name: string;
  pageTemplateData: string;
  pageTemplateDefinitionPath: string;
  type: PageTemplateType;
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
  type: 'component' | 'react' | 'section';
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
