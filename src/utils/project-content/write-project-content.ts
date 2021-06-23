import fs from 'fs';
import mkdirp from 'mkdirp';
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

  mkdirp.sync(path.resolve(projectBasePath, 'src'));

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
  mkdirp.sync(filePath.substring(0, filePath.lastIndexOf(path.sep)));
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
  mkdirp.sync(fragmentBasePath);

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
  mkdirp.sync(fragmentBasePath);

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
  mkdirp.sync(path.resolve(collectionBasePath));

  await _updateJSON(
    path.resolve(collectionBasePath, 'collection.json'),
    collection.metadata
  );

  if (collection.resources.length) {
    mkdirp.sync(path.resolve(collectionBasePath, 'resources'));

    for (const resource of collection.resources) {
      const dirname = path.normalize(path.dirname(resource.filePath));

      mkdirp.sync(path.resolve(collectionBasePath, 'resources', dirname));

      await _updateFile(
        path.normalize(
          path.resolve(collectionBasePath, 'resources', resource.filePath)
        ),
        resource.content
      );
    }
  }

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
  mkdirp.sync(pageTemplateBasePath);

  await _updateFile(
    path.resolve(pageTemplateBasePath, `${pageTemplate.metadata.type}.json`),
    pageTemplate.metadata.pageTemplateData
  );

  await _updateFile(
    path.resolve(pageTemplateBasePath, 'page-definition.json'),
    pageTemplate.definitionData
  );
};
