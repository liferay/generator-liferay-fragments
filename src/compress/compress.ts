import fs from 'fs';
import glob from 'glob';
import JSZip from 'jszip';
import path from 'path';
import tmp from 'tmp';

import { IProject } from '../../types';
import {
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR,
} from '../utils/constants';
import { log } from '../utils/log';
import writeProjectContent from '../utils/project-content/write-project-content';

interface Options {
  addDeploymentDescriptor?: boolean;
  companyWebId?: string;
  groupKey?: string;
}

export default async function compress(
  projectContent: IProject,
  { addDeploymentDescriptor = false, companyWebId = '', groupKey = '' }: Options
): Promise<JSZip> {
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  await writeProjectContent(tmpDir.name, projectContent);

  return new Promise((resolve) => {
    log('Generating zip file', { newLine: true });

    const zip = new JSZip();

    if (addDeploymentDescriptor) {
      _addDeploymentDescriptor(zip, companyWebId, groupKey);
    }

    try {
      fs.mkdirSync(path.join(tmpDir.name, 'build'));
    } catch (_) {}

    glob.sync(path.join(tmpDir.name, 'src', '**/*')).forEach((filePath) => {
      if (fs.statSync(filePath).isFile()) {
        const _basePath = tmpDir.name.replace(/\\/g, path.posix.sep);

        const relativePath = filePath.replace(
          path.posix.join(_basePath, 'src/'),
          ''
        );
        zip.file(relativePath, fs.createReadStream(filePath));
      }
    });

    tmpDir.removeCallback();
    resolve(zip);
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
