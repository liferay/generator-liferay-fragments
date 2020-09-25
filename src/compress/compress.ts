import fs from 'fs';
import glob from 'glob';
import JSZip from 'jszip';
import path from 'path';

import {
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR,
} from '../utils/constants';
import { log } from '../utils/log';

interface Options {
  addDeploymentDescriptor?: boolean;
  companyWebId?: string;
  groupKey?: string;
}

export default function compress(
  basePath: string,
  { addDeploymentDescriptor = false, companyWebId = '', groupKey = '' }: Options
): Promise<JSZip> {
  return new Promise((resolve) => {
    log('Generating zip file', { newLine: true });

    const zip = new JSZip();

    if (addDeploymentDescriptor) {
      _addDeploymentDescriptor(zip, companyWebId, groupKey);
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
}

function _addDeploymentDescriptor(
  zip: JSZip,
  companyWebId = '',
  groupKey = ''
) {
  const deploymentDescriptor: Record<string, string> = {};

  if (companyWebId && companyWebId !== '*') {
    deploymentDescriptor[DEPLOYMENT_DESCRIPTOR_COMPANY_VAR] = companyWebId;

    if (groupKey) {
      deploymentDescriptor[DEPLOYMENT_DESCRIPTOR_GROUP_VAR] = groupKey;
    }
  }

  zip.file(
    'liferay-deploy-fragments.json',
    JSON.stringify(deploymentDescriptor)
  );
}
