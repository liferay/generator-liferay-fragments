const path = require('path');

module.exports.ADD_DEPLOYMENT_DESCRIPTOR_VAR = 'addDeploymentDescriptor';

module.exports.COLLECTION_DESCRIPTION_DEFAULT = '';
module.exports.COLLECTION_DESCRIPTION_VAR = 'collectionDescription';

module.exports.COLLECTION_NAME_VAR = 'collectionName';

module.exports.COLLECTION_SLUG_VAR = 'collectionSlug';

module.exports.DATA_LFR_SUPPORTED = 'dataLfrSupported';
module.exports.DATA_LFR_SUPPORTED_MIN_VERSION = '7.3.3';

module.exports.DEPLOYMENT_DESCRIPTOR_COMPANY_VAR = 'companyWebId';

module.exports.DEPLOYMENT_DESCRIPTOR_GROUP_VAR = 'groupKey';

module.exports.FRAGMENT_COLLECTION_SLUG_MESSAGE = 'Choose a collection';
module.exports.FRAGMENT_COLLECTION_SLUG_VAR = 'fragmentCollectionSlug';

module.exports.FRAGMENT_NAME_MESSAGE = 'Fragment name (required)';
module.exports.FRAGMENT_NAME_NON_EMPTY_ERROR_MESSAGE =
  'Fragment name must not be empty';
module.exports.FRAGMENT_NAME_VAR = 'fragmentName';

module.exports.FRAGMENT_SLUG_VAR = 'fragmentSlug';

module.exports.FRAGMENT_TYPE_DEFAULT = 'section';
module.exports.FRAGMENT_TYPE_MESSAGE = 'Fragment type';
module.exports.FRAGMENT_TYPE_OPTIONS = [
  { name: 'Section', value: 'section' },
  { name: 'Component', value: 'component' },
];
module.exports.FRAGMENT_TYPE_VAR = 'fragmentType';

module.exports.FRAGMENT_COMPOSITION_NAME_SAMPLE = 'Sample fragment composition';
module.exports.FRAGMENT_COMPOSITION_NAME_VAR = 'fragmentCompositionName';

module.exports.FRAGMENT_IMPORT_STATUS = {
  IMPORTED: 'imported',
  IMPORTED_DRAFT: 'imported-draft',
  INVALID: 'invalid',
};

module.exports.FRAGMENTS_PORTLET_ID =
  'com_liferay_fragment_web_portlet_FragmentPortlet';

module.exports.IMPORT_WATCH_VAR = 'watch';

module.exports.MIN_LIFERAY_VERSION_MESSAGE =
  'Minimum liferay version you want fragments to be compatible with (e.g. 7.3.0)';
module.exports.MIN_LIFERAY_VERSION_MESSAGE_ERROR_MESSAGE =
  'Introduce a valid version';

module.exports.MIN_LIFERAY_VERSION_SAMPLE = '7.2.0';
module.exports.MIN_LIFERAY_VERSION_VAR = 'minLiferayVersion';

module.exports.NEW_COLLECTION_MESSAGE = '+ New collection';
module.exports.NEW_COLLECTION_SHORT = '(new)';
module.exports.NEW_COLLECTION_VALUE = '__NEW_COLLECTION_VALUE__';

module.exports.PAGE_TEMPLATE_IMPORT_STATUS = {
  IMPORTED: 'imported',
  IGNORED: 'ignored',
  INVALID: 'invalid',
};

module.exports.PORTLET_FILE_REPOSITORY =
  'com.liferay.portal.repository.portletrepository.PortletRepository';

module.exports.BUNDLER_OUTPUT_DIR = path.join(
  'build',
  'liferay-npm-bundler-output'
);
