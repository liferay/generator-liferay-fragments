import {
  ICollection,
  ICollectionMetadata,
  IFragment,
  IFragmentComposition,
  IFragmentCompositionMetadata,
  IFragmentMetadata,
  IPageTemplate,
  IPageTemplateMetadata,
  IProject,
} from '../../types';

import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { log } from './log';

function _readJSONSync<T>(jsonPath: string): T {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

function _getProjectCollections(basePath: string): ICollection[] {
  return glob
    .sync(path.join(basePath, 'src', '*', 'collection.json'))
    .map((collectionJSON: string) => path.resolve(collectionJSON, '..'))
    .filter((directory) => {
      try {
        _readJSONSync(path.resolve(directory, 'collection.json'));

        return true;
      } catch (_) {
        log(`✘ Invalid ${directory}/collection.json, collection ignored`, {
          level: 'error',
        });

        return false;
      }
    })
    .map((directory) => {
      const metadata = _readJSONSync<ICollectionMetadata>(
        path.resolve(directory, 'collection.json')
      );
      const fragmentCompositions = _getCollectionFragmentCompositions(
        directory
      );
      const fragments = _getCollectionFragments(directory);
      const slug = path.basename(directory);

      return {
        slug,
        fragmentCollectionId: slug,
        metadata,
        fragmentCompositions,
        fragments,
      };
    });
}

function _getCollectionFragments(collectionDirectory: string): IFragment[] {
  return glob
    .sync(path.join(collectionDirectory, '*', 'fragment.json'))
    .map(
      /** @param {string} fragmentJSON */
      (fragmentJSON) => path.resolve(fragmentJSON, '..')
    )
    .filter((directory) => {
      try {
        _readJSONSync(path.resolve(directory, 'fragment.json'));

        return true;
      } catch (_) {
        log(`✘ Invalid ${directory}/fragment.json, fragment ignored`, {
          level: 'error',
        });

        return false;
      }
    })
    .map(
      /** @param {string} directory */
      (directory) => {
        const metadata = _readJSONSync<IFragmentMetadata>(
          path.resolve(directory, 'fragment.json')
        );

        /**
         * @param {string} filePath
         * @return {string}
         */
        const readFile = (filePath) => {
          try {
            return fs.readFileSync(path.resolve(directory, filePath), 'utf-8');
          } catch (_) {
            log(`✘ Fragment ${metadata.name || directory}`, {
              level: 'error',
              newLine: true,
            });

            log(`File ${filePath} was not found`);

            return '';
          }
        };

        return {
          slug: path.basename(directory),
          metadata,

          html: readFile(metadata.htmlPath),
          css: readFile(metadata.cssPath),
          js: readFile(metadata.jsPath),

          configuration: _getFramentConfiguration(
            directory,
            metadata.configurationPath
          ),
        };
      }
    );
}

function _getCollectionFragmentCompositions(
  collectionDirectory: string
): IFragmentComposition[] {
  return glob
    .sync(path.join(collectionDirectory, '*', 'fragment-composition.json'))
    .map((compositionJSON: string) => path.resolve(compositionJSON, '..'))
    .filter((directory: string) => {
      try {
        _readJSONSync(path.resolve(directory, 'fragment-composition.json'));

        return true;
      } catch (_) {
        log(
          `✘ Invalid ${directory}/fragment-composition.json, fragment composition ignored`,
          { level: 'error' }
        );

        return false;
      }
    })
    .map((directory: string) => {
      const metadata = _readJSONSync<IFragmentCompositionMetadata>(
        path.resolve(directory, 'fragment-composition.json')
      );

      const readFile = (filePath: string) => {
        try {
          return fs.readFileSync(path.resolve(directory, filePath), 'utf-8');
        } catch (_) {
          log(`✘ Fragment composition ${metadata.name || directory}`, {
            level: 'error',
            newLine: true,
          });

          log(`File ${filePath} was not found`);

          return '';
        }
      };

      return {
        slug: path.basename(directory),
        metadata,
        definitionData: readFile(metadata.fragmentCompositionDefinitionPath),
      };
    });
}

function _getFramentConfiguration(
  directory: string,
  configurationPath: string
): string {
  if (
    configurationPath &&
    fs.existsSync(path.resolve(directory, configurationPath))
  ) {
    return fs.readFileSync(path.resolve(directory, configurationPath), 'utf-8');
  }

  return '';
}

function _getPageTemplates(basePath: string): IPageTemplate[] {
  return glob
    .sync(path.join(basePath, 'src', '*', 'page-template.json'))
    .map((collectionJSON: string) => path.resolve(collectionJSON, '..'))
    .filter((directory) => {
      try {
        _readJSONSync(path.resolve(directory, 'page-template.json'));

        return true;
      } catch (_) {
        log(
          `✘ Invalid ${directory}/page-template.json, page template ignored`,
          {
            level: 'error',
          }
        );

        return false;
      }
    })
    .map((directory: string) => {
      const metadata = _readJSONSync<IPageTemplateMetadata>(
        path.resolve(directory, 'page-template.json')
      );
      const slug = path.basename(directory);

      return {
        slug,
        metadata: {
          name: metadata.name,
          pageTemplateDefinitionPath: path.resolve(
            directory,
            'page-definition.json'
          ),
        },
        definitionData: JSON.stringify(
          _readJSONSync(path.resolve(directory, 'page-definition.json'))
        ),
      };
    });
}

function getProjectContent(basePath: string): IProject {
  return {
    basePath,
    project: _readJSONSync(path.resolve(basePath, 'package.json')),
    collections: _getProjectCollections(basePath),
    pageTemplates: _getPageTemplates(basePath),
  };
}

module.exports = getProjectContent;
