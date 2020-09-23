const fs = require('fs');
const glob = require('glob');
const JSZip = require('jszip');
const path = require('path');

const {
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR,
} = require('../utils/constants');
const { log } = require('../utils/log');

/**
 * Compress a whole project from a basePath with all it's
 * fragments and collections.
 * @param {string} basePath Base path to use as project
 * @param {object} options
 * @param {boolean} [options.addDeploymentDescriptor=false]
 * @param {string} [options.companyWebId]
 * @param {string} [options.groupKey]
 * @return {Promise<JSZip>} Promise with the generated zip
 */
const compress = (
  basePath,
  { addDeploymentDescriptor, companyWebId, groupKey }
) =>
  new Promise((resolve) => {
    log('Generating zip file', { newLine: true });

    const zip = new JSZip();

    if (addDeploymentDescriptor) {
      _addDeploymentDescriptor(companyWebId, groupKey, zip);
    }

    try {
      fs.mkdirSync(path.join(basePath, 'build'));
    } catch (_) {}

    glob.sync(path.join(basePath, 'src', '**/*')).forEach((filePath) => {
      if (fs.statSync(filePath).isFile()) {
        const _basePath = basePath.replace(/\\/g, path.posix.sep);

        const relativePath = filePath.replace(
          path.posix.join(_basePath, 'src/'),
          ''
        );
        zip.file(relativePath, fs.createReadStream(filePath));
      }
    });

    zip
      .generateNodeStream({
        type: 'nodebuffer',
        streamFiles: true,
      })
      .pipe(
        fs.createWriteStream(
          path.join(basePath, 'build', 'liferay-fragments.zip')
        )
      )
      .on('finish', () => {
        log('build/liferay-fragments.zip file created', {
          newLine: true,
          level: 'success',
        });

        log('Import them to your liferay-portal to start using them', {
          level: 'success',
        });

        resolve(zip);
      });
  });

/**
 * Adds a deployment descriptor object to the given zip file.
 * The zip file will be modified
 * @param {string|undefined} companyWebId
 * @param {string|undefined} groupKey
 * @param {JSZip} zip Zip file to be modified
 */
function _addDeploymentDescriptor(companyWebId, groupKey, zip) {
  const deploymentDescriptorCompany = companyWebId;
  const deploymentDescriptorGroup = groupKey;

  const deploymentDescriptor = {};

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
