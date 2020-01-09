const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');
const {
  ADD_DEPLOYMENT_DESCRIPTOR_VAR,
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR
} = require('../../utils/constants');
const getProjectContent = require('../../utils/get-project-content');
const { log, LOG_LEVEL } = require('../../utils/log');

/**
 * Adds a given collection object to the given zip file.
 * The zip file will be modified
 * @param {import('../../types/index').ICollection} collection Collection to be added
 * @param {JSZip} zip Zip file to be modified
 */
function _addCollectionToZip(collection, zip) {
  zip.file(
    `${collection.slug}/collection.json`,
    JSON.stringify(collection.metadata)
  );

  log('Collection', {
    newLine: true,
    level: LOG_LEVEL.success,
    data: collection.metadata.name
  });

  collection.fragments.forEach(fragment => {
    _addFragmentToZip(collection, fragment, zip);
  });
}

/**
 * Adds a deployment descriptor object to the given zip file.
 * The zip file will be modified
 * @param {object} options Generator parameters
 * @param {JSZip} zip Zip file to be modified
 */
function _addDeploymentDescriptor(options, zip) {
  const deploymentDescriptorCompany =
    options[DEPLOYMENT_DESCRIPTOR_COMPANY_VAR];
  const deploymentDescriptorGroup = options[DEPLOYMENT_DESCRIPTOR_GROUP_VAR];

  const deploymentDescriptor = Object.assign({});

  if (
    deploymentDescriptorCompany &&
    deploymentDescriptorCompany.length > 0 &&
    deploymentDescriptorCompany !== '*'
  ) {
    deploymentDescriptor[
      DEPLOYMENT_DESCRIPTOR_COMPANY_VAR
    ] = deploymentDescriptorCompany;

    if (deploymentDescriptorGroup && deploymentDescriptorGroup.length > 0) {
      deploymentDescriptor[
        DEPLOYMENT_DESCRIPTOR_GROUP_VAR
      ] = deploymentDescriptorGroup;
    }
  }

  zip.file(
    'liferay-deploy-fragments.json',
    JSON.stringify(deploymentDescriptor)
  );
}

/**
 * Adds a given fragment object to the given zip file.
 * The zip file will be modified
 * @param {import('../../types/index').ICollection} collection Collection to be added
 * @param {import('../../types/index').IFragment} fragment Fragment to be added
 * @param {JSZip} zip Zip file to be modified
 */
function _addFragmentToZip(collection, fragment, zip) {
  zip.file(
    `${collection.slug}/${fragment.slug}/fragment.json`,
    JSON.stringify(fragment.metadata)
  );

  zip.file(
    `${collection.slug}/${fragment.slug}/${fragment.metadata.htmlPath}`,
    fragment.html
  );

  zip.file(
    `${collection.slug}/${fragment.slug}/${fragment.metadata.cssPath}`,
    fragment.css
  );

  zip.file(
    `${collection.slug}/${fragment.slug}/${fragment.metadata.jsPath}`,
    fragment.js
  );

  zip.file(
    `${collection.slug}/${fragment.slug}/${fragment.metadata.configurationPath}`,
    fragment.configuration
  );

  if (fragment.thumbnail) {
    zip.file(
      `${collection.slug}/${fragment.slug}/${fragment.metadata.thumbnailPath}`,
      fragment.thumbnail
    );
  }

  log('fragment', {
    level: LOG_LEVEL.success,
    indent: true,
    data: fragment.metadata.name
  });
}

/**
 * Compress a whole project from a basePath with all it's
 * fragments and collections.
 * @param {string} basePath Base path to use as project
 * @param {object} options Generator parameters
 * @return {Promise<JSZip>} Promise with the generated zip
 */
const compress = (basePath, options) =>
  new Promise(resolve => {
    const zip = new JSZip();
    const project = getProjectContent(basePath);

    log('Generating zip file', { newLine: true });

    project.collections.forEach(collection => {
      _addCollectionToZip(collection, zip);
    });

    if (options[ADD_DEPLOYMENT_DESCRIPTOR_VAR]) {
      _addDeploymentDescriptor(options, zip);
    }

    try {
      fs.mkdirSync(path.join(basePath, 'build'));
    } catch (error) {}

    zip
      .generateNodeStream({
        type: 'nodebuffer',
        streamFiles: true
      })
      .pipe(
        fs.createWriteStream(
          path.join(basePath, 'build', 'liferay-fragments.zip')
        )
      )
      .on('finish', () => {
        log('build/liferay-fragments.zip file created', {
          newLine: true,
          level: LOG_LEVEL.success
        });

        log('Import them to your liferay-portal to start using them:', {
          level: LOG_LEVEL.success
        });

        log(
          'https://dev.liferay.com/discover/portal/-/knowledge_base/7-1/exporting-and-importing-fragments#importing-collections'
        );

        resolve(zip);
      });
  });

module.exports = compress;
