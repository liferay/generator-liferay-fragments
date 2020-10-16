import fs from 'fs';
import glob from 'glob';
import JSZip from 'jszip';
import path from 'path';

import { IProject } from '../../types';
import {
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR,
} from '../utils/constants';
import writeProjectContent from '../utils/project-content/write-project-content';
import { createTemporaryDirectory } from '../utils/temporary';

interface Options {
  addDeploymentDescriptor?: boolean;
  companyWebId?: string;
  groupKey?: string;
}

export default async function compress(
  projectContent: IProject,
  { addDeploymentDescriptor = false, companyWebId = '', groupKey = '' }: Options
): Promise<JSZip> {
  const tmpDir = createTemporaryDirectory();
  await writeProjectContent(tmpDir.name, projectContent);

  const zip = new JSZip();

  if (addDeploymentDescriptor) {
    _addDeploymentDescriptor(zip, companyWebId, groupKey);
  }

  glob.sync(path.join(tmpDir.name, '**', '*')).forEach((filePath) => {
    if (fs.statSync(filePath).isFile()) {
      zip.file(
        path.relative(tmpDir.name, filePath).replace(path.sep, path.posix.sep),
        fs.readFileSync(filePath)
      );
    }
  });

  tmpDir.removeCallback();

  return zip;
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
