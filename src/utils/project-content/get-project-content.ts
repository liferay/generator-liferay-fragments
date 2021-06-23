import fs from 'fs';
import glob from 'glob';
import path from 'path';

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
  PageTemplateType,
} from '../../../types';

export default function getProjectContent(basePath: string): IProject {
  const excludedFiles = [
    'default-liferay-npm-bundler.config.js',
    'node_modules',
    'package.json',
    'src',
    'yarn.lock',
    'yarn-error.log',
    '*.md',
    '.editorconfig',
    '.gitignore',
    '.yo-rc.json',
  ];

  const unknownFiles = glob
    .sync(path.join(basePath, `!(${excludedFiles.join('|')})`), { dot: true })
    .filter((filePath) => fs.statSync(filePath).isFile());

  try {
    return {
      basePath,
      project: _readJSONSync(path.resolve(basePath, 'package.json')),
      collections: _getProjectCollections(basePath),
      pageTemplates: _getPageTemplates(basePath),

      unknownFiles: unknownFiles.map((filePath) => ({
        content: fs.readFileSync(filePath),
        filePath: path.relative(basePath, filePath),
      })),
    };
  } catch (_) {
    throw new Error(`Invalid project structure for path ${basePath}`);
  }
}

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
    .map((fragmentJSON) => path.resolve(fragmentJSON, '..'))
    .filter((directory) => {
      try {
        _readJSONSync(path.resolve(directory, 'fragment.json'));

        return true;
      } catch (_) {
        return false;
      }
    })
    .map((directory) => {
      const metadata = _readJSONSync<IFragmentMetadata>(
        path.resolve(directory, 'fragment.json')
      );

      const readFile = (
        filePath: string | undefined,
        defaultValue: Buffer = Buffer.from('')
      ): Buffer => {
        if (!filePath) {
          return defaultValue;
        }

        try {
          return fs.readFileSync(path.resolve(directory, filePath));
        } catch (_) {
          return defaultValue;
        }
      };

      const readTextFile = (filePath: string | undefined, defaultValue = '') =>
        readFile(filePath, Buffer.from(defaultValue)).toString('utf-8');

      const excludedFiles = [
        'fragment.json',
        metadata.htmlPath,
        metadata.cssPath,
        metadata.jsPath,
        metadata.configurationPath,
        metadata.thumbnailPath,
      ];

      const unknownFiles = glob
        .sync(path.join(directory, '**', '*'), {
          dot: true,
        })
        .filter(
          (filePath) =>
            !excludedFiles.includes(path.relative(directory, filePath)) &&
            fs.statSync(filePath).isFile()
        );

      return {
        slug: path.basename(directory),
        metadata,

        html: readTextFile(metadata.htmlPath),
        css: readTextFile(metadata.cssPath),
        js: readTextFile(metadata.jsPath),
        configuration: readTextFile(metadata.configurationPath),
        thumbnail: readFile(metadata.thumbnailPath),

        unknownFiles: unknownFiles.map((filePath) => ({
          content: fs.readFileSync(filePath),
          filePath: path.relative(directory, filePath),
        })),
      };
    });
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

function _getPageTemplates(basePath: string): IPageTemplate[] {
  const displayPageTemplates = _getPageTemplatesByType(
    basePath,
    'display-page-template'
  );
  const pageTemplates = _getPageTemplatesByType(basePath, 'page-template');
  const masterPages = _getPageTemplatesByType(basePath, 'master-page');

  return [...displayPageTemplates, ...pageTemplates, ...masterPages];
}

function _getPageTemplatesByType(
  basePath: string,
  type: PageTemplateType
): IPageTemplate[] {
  const pageTemplateFileName = `${type}.json`;

  return glob
    .sync(path.join(basePath, 'src', '*', pageTemplateFileName))
    .map((collectionJSON: string) => path.resolve(collectionJSON, '..'))
    .filter((directory) => {
      try {
        _readJSONSync(path.resolve(directory, pageTemplateFileName));

        return true;
      } catch (_) {
        return false;
      }
    })
    .map((directory: string) => {
      const pageTemplatePath = path.resolve(directory, pageTemplateFileName);
      const metadata = _readJSONSync<IPageTemplateMetadata>(pageTemplatePath);
      const slug = path.basename(directory);

      return {
        slug,
        metadata: {
          name: metadata.name,
          pageTemplateData: fs.readFileSync(pageTemplatePath, 'utf-8'),
          pageTemplateDefinitionPath: path.resolve(
            directory,
            'page-definition.json'
          ),
          type,
        },
        definitionData: JSON.stringify(
          _readJSONSync(path.resolve(directory, 'page-definition.json'))
        ),
      };
    });
}
