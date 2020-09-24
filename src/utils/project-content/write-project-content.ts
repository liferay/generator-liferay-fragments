import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import util from 'util';

import {
  ICollection,
  IFragment,
  IFragmentComposition,
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
    projectContent.collections.map((collection) =>
      _writeCollection(
        path.resolve(projectBasePath, 'src', collection.slug),
        collection
      )
    )
  );
}

const _updateFile = async (path: string, content: string) => {
  await writeFilePromise(path, content);
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

  await _updateFile(
    path.resolve(fragmentBasePath, fragment.metadata.configurationPath),
    fragment.configuration
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
