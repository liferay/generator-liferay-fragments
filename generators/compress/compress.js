const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');
const {
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR
} = require('../../utils/constants');
const { log, LOG_LEVEL } = require('../../utils/log');
const glob = require('glob');

/**
 * Compress a whole project from a basePath with all it's
 * fragments and collections.
 * @param {string} basePath Base path to use as project
 * @param {object} options Generator parameters
 * @param {boolean} [options.addDeploymentDescriptor=false]
 * @return {Promise<JSZip>} Promise with the generated zip
 */
const compress = (basePath, options) =>
  new Promise(resolve => {
    log('Generating zip file', { newLine: true });

    const zip = new JSZip();

    if (options.addDeploymentDescriptor) {
      _addDeploymentDescriptor(options, zip);
    }

    try {
      fs.mkdirSync(path.join(basePath, 'build'));
    } catch (error) {}

    glob.sync(path.join(basePath, 'src', '**/*')).forEach(filePath => {
      if (fs.statSync(filePath).isFile()) {
        const relativePath = filePath.replace(path.join(basePath, 'src'), '');
        zip.file(relativePath, fs.createReadStream(filePath));
      }
    });

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

module.exports = compress;
