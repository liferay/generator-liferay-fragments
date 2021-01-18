import chokidar from 'chokidar';
import path from 'path';

import { IProject } from '../../types';
import AuthGenerator from '../utils/auth-generator';
import {
  FRAGMENT_IMPORT_STATUS,
  IMPORT_WATCH_VAR,
  PAGE_TEMPLATE_IMPORT_STATUS,
} from '../utils/constants';
import { buildProjectContent } from '../utils/project-content/build-project-content';
import getProjectContent from '../utils/project-content/get-project-content';
import importProject, { ImportResult } from './import';

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
            this.logMessage(`Watching changes in ${watchPath}`);
            this.logMessage('Press Ctrl+C to stop watching\n');
            this.logMessage('Host', { data: host });
            this.logMessage('User', { data: user });
            this.logMessage('Company', { data: company.name });
            this.logMessage('Group', { data: group.name });

            queuedUpdate = false;

            updatePromise = new Promise<IProject>((resolve) => {
              this.logMessage('Building project...');

              buildProjectContent(
                getProjectContent(this.destinationPath())
              ).then(resolve);
            }).then((builtProjectContent) => {
              this.logMessage('Importing project...');

              importProject(builtProjectContent, group.value).then(
                (importResults) => {
                  this._logImportResults(importResults);
                }
              );

              this.logMessage('Project imported', { level: 'success' });
            });
          }
        });
      });
    } else {
      this.logMessage('Building project...');
      const builtProjectContent = await buildProjectContent(
        getProjectContent(this.destinationPath())
      );

      try {
        this.logMessage('Importing project...');

        this._logImportResults(
          await importProject(builtProjectContent, group.value)
        );

        this.logMessage('Project imported', { level: 'success' });
      } catch (error) {
        this.logMessage('There was an error importing project', {
          level: 'error',
        });
        console.log(error);
      }
    }
  }

  private _logImportResults(importResults: undefined | ImportResult[][]) {
    const [fragmentResults = [], pageTemplateResults = []] =
      importResults || [];

    fragmentResults.forEach((result) => {
      switch (result.status) {
        case FRAGMENT_IMPORT_STATUS.IMPORTED: {
          this.logMessage(`✔ Fragment ${result.name} imported`, {
            level: 'success',
          });

          break;
        }

        case FRAGMENT_IMPORT_STATUS.IMPORTED_DRAFT: {
          this.logMessage(
            `↷ Fragment ${result.name} imported as draft due to the following errors`,
            {
              level: 'info',
            }
          );

          this.logMessage(`ERROR: ${result.errorMessage}`, {
            level: 'error',
          });

          break;
        }

        case FRAGMENT_IMPORT_STATUS.INVALID: {
          this.logMessage(
            `Fragment ${result.name} not imported due to the following errors`,
            {
              level: 'error',
            }
          );

          this.logMessage(`ERROR: ${result.errorMessage}`, {
            level: 'error',
          });

          break;
        }

        default:
          break;
      }
    });

    pageTemplateResults.forEach((result) => {
      switch (result.status) {
        case PAGE_TEMPLATE_IMPORT_STATUS.IMPORTED: {
          this.logMessage(`✔ Page template ${result.name} imported`, {
            level: 'success',
          });

          break;
        }

        case PAGE_TEMPLATE_IMPORT_STATUS.IGNORED: {
          this.logMessage(`↷ Page template ${result.name} ignored`, {
            level: 'info',
          });

          break;
        }

        case PAGE_TEMPLATE_IMPORT_STATUS.INVALID: {
          this.logMessage(
            `Page template ${result.name} not imported due to the following errors`,
            {
              level: 'error',
            }
          );

          this.logMessage(`ERROR: ${result.errorMessage}`, {
            level: 'error',
          });

          break;
        }

        default:
          break;
      }
    });
  }
}
