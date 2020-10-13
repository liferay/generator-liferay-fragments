import fs from 'fs';
import glob from 'glob';
import path from 'path';
import voca from 'voca';

import {
  FRAGMENT_COLLECTION_SLUG_MESSAGE,
  FRAGMENT_COLLECTION_SLUG_VAR,
  FRAGMENT_COMPOSITION_NAME_VAR,
  FRAGMENT_SLUG_VAR,
  NEW_COLLECTION_MESSAGE,
  NEW_COLLECTION_SHORT,
  NEW_COLLECTION_VALUE,
} from '../utils/constants';
import CustomGenerator from '../utils/custom-generator';

export default class FragmentCompositionGenerator extends CustomGenerator {
  async prompting(): Promise<void> {
    await this.ask([
      {
        type: 'input',
        name: FRAGMENT_COMPOSITION_NAME_VAR,
        message: 'Fragment composition name',
        validate: (name) => (name ? true : 'Fragment name must not be empty'),
        when: !this.hasValue(FRAGMENT_COMPOSITION_NAME_VAR),
      },
    ]);

    this.setValue(
      FRAGMENT_SLUG_VAR,
      voca.slugify(this.getValue(FRAGMENT_COMPOSITION_NAME_VAR))
    );

    await this.ask({
      type: 'list',
      name: FRAGMENT_COLLECTION_SLUG_VAR,
      message: FRAGMENT_COLLECTION_SLUG_MESSAGE,
      choices: this._getCollectionChoices(),
      when: !this.hasValue(FRAGMENT_COLLECTION_SLUG_VAR),
    });
  }

  writing(): void {
    if (this.getValue(FRAGMENT_COLLECTION_SLUG_VAR) === NEW_COLLECTION_VALUE) {
      this.composeWith(require.resolve('../collection'), {
        [FRAGMENT_COMPOSITION_NAME_VAR]: this.getValue(
          FRAGMENT_COMPOSITION_NAME_VAR
        ),
      });
    } else {
      this.throwRequiredError(FRAGMENT_COLLECTION_SLUG_VAR);
      this.throwRequiredError(FRAGMENT_SLUG_VAR);

      const basePath = path.join(
        'src',
        this.getValue(FRAGMENT_COLLECTION_SLUG_VAR) || '',
        this.getValue(FRAGMENT_SLUG_VAR) || ''
      );

      this.copyTemplates(basePath, [
        'fragment-composition.json',
        'definition.json',
      ]);
    }
  }

  private _getCollectionChoices() {
    let choices: Array<{
      name: string;
      value: string;
      short: string;
    }> = [];

    try {
      choices = glob
        .sync(`${this.destinationRoot()}/src/*/collection.json`)
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
}
