import path from 'path';

import {
  ADD_DEPLOYMENT_DESCRIPTOR_VAR,
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR,
} from '../utils/constants';
import CustomGenerator from '../utils/custom-generator';
import { buildProjectContent } from '../utils/project-content/build-project-content';
import getProjectContent from '../utils/project-content/get-project-content';
import writeZip from '../utils/write-zip';
import compress from './compress';

export default class extends CustomGenerator {
  async asking(): Promise<void> {
    await this.ask([
      {
        type: 'confirm',
        name: ADD_DEPLOYMENT_DESCRIPTOR_VAR,
        message: 'Add deployment descriptor?',
        default: true,
        when: !this.hasValue(ADD_DEPLOYMENT_DESCRIPTOR_VAR),
      },
    ]);

    if (this.getValue(ADD_DEPLOYMENT_DESCRIPTOR_VAR)) {
      await this.ask([
        {
          type: 'input',
          name: DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
          message: 'Deployment descriptor company Web ID?',
          default: 'liferay.com',
          when: !this.hasValue(DEPLOYMENT_DESCRIPTOR_COMPANY_VAR),
        },
      ]);

      if (
        this.hasValue(DEPLOYMENT_DESCRIPTOR_COMPANY_VAR) &&
        this.getValue(DEPLOYMENT_DESCRIPTOR_COMPANY_VAR) !== '*'
      ) {
        await this.ask([
          {
            type: 'input',
            name: DEPLOYMENT_DESCRIPTOR_GROUP_VAR,
            message: 'Deployment descriptor group key?',
            default: 'Guest',
            when: !this.hasValue(DEPLOYMENT_DESCRIPTOR_GROUP_VAR),
          },
        ]);
      }
    }

    this.log('Building project...');
    const projectContent = await buildProjectContent(
      getProjectContent(this.destinationPath())
    );

    this.log('Generating zip file...');
    await writeZip(
      await compress(projectContent, {
        [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: !!this.getValue(
          ADD_DEPLOYMENT_DESCRIPTOR_VAR
        ),
        [DEPLOYMENT_DESCRIPTOR_COMPANY_VAR]: this.getValue(
          DEPLOYMENT_DESCRIPTOR_COMPANY_VAR
        ),
        [DEPLOYMENT_DESCRIPTOR_GROUP_VAR]: this.getValue(
          DEPLOYMENT_DESCRIPTOR_GROUP_VAR
        ),
      }),
      path.join(this.destinationPath(), 'build', 'liferay-fragments.zip')
    );

    this.log('build/liferay-fragments.zip file created', {
      newLine: true,
      level: 'success',
    });

    this.log('Import them to your liferay-portal to start using them', {
      level: 'success',
    });
  }
}
