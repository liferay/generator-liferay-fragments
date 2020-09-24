import chokidar from 'chokidar';
import path from 'path';

import AuthGenerator from '../utils/auth-generator';
import { IMPORT_WATCH_VAR } from '../utils/constants';
import { log } from '../utils/log';
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
            updatePromise = importProject(group.value, this.destinationPath());
          }
        });
      });
    } else {
      await importProject(group.value, this.destinationPath());
    }
  }
}
