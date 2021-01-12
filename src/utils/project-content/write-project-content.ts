import fs from 'fs';
import path from 'path';
import util from 'util';

import {
  ICollection,
  IFragment,
  IFragmentComposition,
  IPageTemplate,
  IProject,
} from '../../../types';
import { assertProjectContent, assertValidPath } from '../assert';

const writeFilePromise = util.promisify(fs.writeFile);

export default async function writeProjectContent(
  projectBasePath: string,
  projectContent: IProject
): Promise<void> {
  assertValidPath(
    projectBasePath,
    'projectBasePath must be a valid filesystem path'
  );

  assertProjectContent(
    projectContent,
    'projectContent must be a valid project object'
  );

  fs.mkdirSync(path.resolve(projectBasePath, 'src'), { recursive: true });

  await _updateJSON(
    path.resolve(projectBasePath, 'package.json'),
    projectContent.project
  );

  await Promise.all(
    projectContent.unknownFiles.map((unknownFile) =>
      _updateFile(
        path.resolve(projectBasePath, unknownFile.filePath),
        unknownFile.content
      )
    )
  );

  await Promise.all(
    projectContent.collections.map((collection) =>
      _writeCollection(
        path.resolve(projectBasePath, 'src', collection.slug),
        collection
      )
    )
  );

  if (projectContent.pageTemplates) {
    await Promise.all(
      projectContent.pageTemplates.map((pageTemplate) =>
        _writePageTemplate(
          path.resolve(projectBasePath, 'src', pageTemplate.slug),
          pageTemplate
        )
      )
    );
  }
}

const _updateFile = async (filePath: string, content: string | Buffer) => {
  fs.mkdirSync(filePath.substring(0, filePath.lastIndexOf(path.sep)), {
    recursive: true,
  });
  await writeFilePromise(filePath, content);
};

const _updateJSON = async (path: string, content: any) => {
  let newContent = content;

  try {
    const oldContent = JSON.parse(fs.readFileSync(path, 'utf-8'));
    newContent = { ...oldContent, ...content };
  } catch (_) {}

  await _updateFile(path, JSON.stringify(newContent, null, 2));
};

const _writeFragment = async (
  fragmentBasePath: string,
  collection: ICollection,
  fragment: IFragment
) => {
  fs.mkdirSync(fragmentBasePath, { recursive: true });

  await _updateJSON(
    path.resolve(fragmentBasePath, 'fragment.json'),
    fragment.metadata
  );

  await _updateFile(
    path.resolve(fragmentBasePath, fragment.metadata.cssPath),
    fragment.css
  );

  if (fragment.metadata.configurationPath) {
    await _updateFile(
      path.resolve(fragmentBasePath, fragment.metadata.configurationPath),
      fragment.configuration
    );
  }

  if (fragment.thumbnail && fragment.metadata.thumbnailPath) {
    await _updateFile(
      path.resolve(fragmentBasePath, fragment.metadata.thumbnailPath),
      fragment.thumbnail
    );
  }

  await Promise.all(
    fragment.unknownFiles.map((unknownFile) =>
      _updateFile(
        path.resolve(fragmentBasePath, unknownFile.filePath),
        unknownFile.content
      )
    )
  );

  await _updateFile(
    path.resolve(fragmentBasePath, fragment.metadata.htmlPath),
    fragment.html
  );

  await _updateFile(
    path.resolve(fragmentBasePath, fragment.metadata.jsPath),
    fragment.js
  );
};

const _writeFragmentComposition = async (
  fragmentBasePath: string,
  collection: ICollection,
  fragmentComposition: IFragmentComposition
) => {
  fs.mkdirSync(fragmentBasePath, { recursive: true });

  await _updateJSON(
    path.resolve(fragmentBasePath, 'fragment-composition.json'),
    fragmentComposition.metadata
  );

  const definition = JSON.parse(fragmentComposition.definitionData);

  await _updateFile(
    path.resolve(
      fragmentBasePath,
      fragmentComposition.metadata.fragmentCompositionDefinitionPath
    ),
    JSON.stringify(definition, null, 2)
  );
};

const _writeCollection = async (
  collectionBasePath: string,
  collection: ICollection
) => {
  fs.mkdirSync(path.resolve(collectionBasePath), { recursive: true });

  await _updateJSON(
    path.resolve(collectionBasePath, 'collection.json'),
    collection.metadata
  );

  let fragmentCompositions: Promise<void>[] = [];

  if (collection.fragmentCompositions) {
    fragmentCompositions = collection.fragmentCompositions.map(
      (fragmentComposition) =>
        _writeFragmentComposition(
          path.resolve(collectionBasePath, fragmentComposition.slug),
          collection,
          fragmentComposition
        )
    );
  }

  await Promise.all([
    ...collection.fragments.map((fragment) =>
      _writeFragment(
        path.resolve(collectionBasePath, fragment.slug),
        collection,
        fragment
      )
    ),
    ...fragmentCompositions,
  ]);
};

const _writePageTemplate = async (
  pageTemplateBasePath: string,
  pageTemplate: IPageTemplate
) => {
  fs.mkdirSync(pageTemplateBasePath, { recursive: true });

  await _updateFile(
    path.resolve(pageTemplateBasePath, `${pageTemplate.metadata.type}.json`),
    pageTemplate.metadata.pageTemplateData
  );

  await _updateFile(
    path.resolve(pageTemplateBasePath, 'page-definition.json'),
    pageTemplate.definitionData
  );
};
