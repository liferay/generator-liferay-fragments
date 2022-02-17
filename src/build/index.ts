import path from 'path';
import rimraf from 'rimraf';

import CustomGenerator from '../utils/custom-generator';
import { buildProjectContent } from '../utils/project-content/build-project-content';
import getProjectContent from '../utils/project-content/get-project-content';
import writeProjectContent from '../utils/project-content/write-project-content';

export default class extends CustomGenerator {
  async asking(): Promise<void> {
    this.logMessage('Building project...');

    const projectContent = await buildProjectContent(
      getProjectContent(this.destinationPath())
    );

    projectContent.unknownFiles = [];

    rimraf.sync(
      path.join(this.destinationPath(), 'build', 'liferay-fragments')
    );

    await writeProjectContent(
      path.join(this.destinationPath(), 'build', 'liferay-fragments'),
      projectContent
    );

    this.logMessage('build/liferay-fragments directory created', {
      newLine: true,
      level: 'success',
    });
  }
}
