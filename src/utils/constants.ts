import path from 'path';

export const ADD_DEPLOYMENT_DESCRIPTOR_VAR = 'addDeploymentDescriptor';
export const COLLECTION_DESCRIPTION_DEFAULT = '';
export const COLLECTION_DESCRIPTION_VAR = 'collectionDescription';
export const COLLECTION_NAME_VAR = 'collectionName';
export const COLLECTION_SLUG_VAR = 'collectionSlug';
export const DEPLOYMENT_DESCRIPTOR_COMPANY_VAR = 'companyWebId';
export const DEPLOYMENT_DESCRIPTOR_GROUP_VAR = 'groupKey';
export const FRAGMENT_COLLECTION_SLUG_MESSAGE = 'Choose a collection';
export const FRAGMENT_COLLECTION_SLUG_VAR = 'fragmentCollectionSlug';
export const FRAGMENT_COMPOSITION_NAME_VAR = 'fragmentCompositionName';
export const FRAGMENT_NAME_VAR = 'fragmentName';
export const FRAGMENT_SLUG_VAR = 'fragmentSlug';
export const FRAGMENT_TYPE_VAR = 'fragmentType';
export const IMPORT_WATCH_VAR = 'watch';
export const USE_DATA_LFR_EDITABLES_VAR = 'useDataLfrEditables';
export const NEW_COLLECTION_MESSAGE = '+ New collection';
export const NEW_COLLECTION_SHORT = '(new)';
export const NEW_COLLECTION_VALUE = '__NEW_COLLECTION_VALUE__';

export const BUNDLER_OUTPUT_DIR = path.join(
  'build',
  'liferay-npm-bundler-output'
);

export const FRAGMENT_IMPORT_STATUS = {
  IMPORTED: 'imported',
  IMPORTED_DRAFT: 'imported-draft',
  INVALID: 'invalid',
};

export const FRAGMENTS_PORTLET_ID =
  'com_liferay_fragment_web_portlet_FragmentPortlet';

export const PAGE_TEMPLATE_IMPORT_STATUS = {
  IMPORTED: 'imported',
  IGNORED: 'ignored',
  INVALID: 'invalid',
};

export const PORTLET_FILE_REPOSITORY =
  'com.liferay.portal.repository.portletrepository.PortletRepository';
