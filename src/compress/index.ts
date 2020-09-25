import path from 'path';

import {
  ADD_DEPLOYMENT_DESCRIPTOR_VAR,
  DEPLOYMENT_DESCRIPTOR_COMPANY_VAR,
  DEPLOYMENT_DESCRIPTOR_GROUP_VAR,
} from '../utils/constants';
import CustomGenerator from '../utils/custom-generator';
import { log } from '../utils/log';
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

    if (this.answers[ADD_DEPLOYMENT_DESCRIPTOR_VAR]) {
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
        this.answers[DEPLOYMENT_DESCRIPTOR_COMPANY_VAR] &&
        this.answers[DEPLOYMENT_DESCRIPTOR_COMPANY_VAR] !== '*'
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

    await writeZip(
      await compress(getProjectContent(this.destinationPath()), {
        [ADD_DEPLOYMENT_DESCRIPTOR_VAR]: this.getValue(
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

    log('build/liferay-fragments.zip file created', {
      newLine: true,
      level: 'success',
    });

    log('Import them to your liferay-portal to start using them', {
      level: 'success',
    });
  }
}
