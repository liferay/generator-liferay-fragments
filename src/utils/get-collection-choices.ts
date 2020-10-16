import fs from 'fs';
import glob from 'glob';
import path from 'path';

import {
  NEW_COLLECTION_MESSAGE,
  NEW_COLLECTION_SHORT,
  NEW_COLLECTION_VALUE,
} from './constants';

interface CollectionChoice {
  name: string;
  value: string;
  short: string;
}

export function getCollectionChoices(projectPath: string): CollectionChoice[] {
  let choices: CollectionChoice[] = [];

  try {
    choices = glob
      .sync(`${projectPath}/src/*/collection.json`)
      .map((collectionJSON) => {
        const collectionName = JSON.parse(
          fs.readFileSync(collectionJSON, 'utf-8')
        ).name;

        const collectionSlug = path.basename(
          path.resolve(`${collectionJSON}/..`)
        );

        return {
          name: collectionName,
          value: collectionSlug,
          short: `(${collectionSlug})`,
        };
      });
  } catch (_) {}

  choices.push({
    name: NEW_COLLECTION_MESSAGE,
    value: NEW_COLLECTION_VALUE,
    short: NEW_COLLECTION_SHORT,
  });

  return choices;
}
