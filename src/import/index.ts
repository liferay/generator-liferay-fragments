import chokidar from 'chokidar';
import path from 'path';

import { IProject } from '../../types';
import AuthGenerator from '../utils/auth-generator';
import { IMPORT_WATCH_VAR } from '../utils/constants';
import { log } from '../utils/log';
import { buildProjectContent } from '../utils/project-content/build-project-content';
import getProjectContent from '../utils/project-content/get-project-content';
import importProject from './import';

export default class extends AuthGenerator {
  constructor(args: any, options: any) {
    super(args, options);
    this.argument(IMPORT_WATCH_VAR, { type: String, required: false });
  }

  async asking(): Promise<void> {
    await super.asking();

    const host = this.getHost();
    const user = this.getUsername();
    const group = this.getGroup();
    const company = this.getCompany();

    if (!host || !user || !group || !company) {
      throw new Error('Unexpected error: invalid server data');
    }

    if (this.getValue(IMPORT_WATCH_VAR)) {
      const watchPath = path.resolve(this.destinationPath(), 'src');

      let updatePromise = Promise.resolve();
      let queuedUpdate = false;

      await new Promise(() => {
        chokidar.watch(watchPath).on('all', async () => {
          if (!queuedUpdate) {
            queuedUpdate = true;
            await updatePromise;

            console.clear();
            log(`Watching changes in ${watchPath}`);
            log('Press Ctrl+C to stop watching\n');
            log('Host', { data: host });
            log('User', { data: user });
            log('Company', { data: company.name });
            log('Group', { data: group.name });

            queuedUpdate = false;

            updatePromise = new Promise<IProject>((resolve) => {
              log('Building project...', { newLine: true });

              buildProjectContent(
                getProjectContent(this.destinationPath())
              ).then(resolve);
            }).then((builtProjectContent) =>
              importProject(builtProjectContent, group.value)
            );
          }
        });
      });
    } else {
      log('Building project...', { newLine: true });

      const builtProjectContent = await buildProjectContent(
        getProjectContent(this.destinationPath())
      );

      await importProject(builtProjectContent, group.value);
    }
  }
}
