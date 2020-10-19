import path from 'path';
import voca from 'voca';

import CollectionGenerator from '../collection';
import {
  FRAGMENT_COLLECTION_SLUG_MESSAGE,
  FRAGMENT_COLLECTION_SLUG_VAR,
  FRAGMENT_NAME_MESSAGE,
  FRAGMENT_NAME_NON_EMPTY_ERROR_MESSAGE,
  FRAGMENT_NAME_VAR,
  FRAGMENT_SLUG_VAR,
  FRAGMENT_TYPE_DEFAULT,
  FRAGMENT_TYPE_MESSAGE,
  FRAGMENT_TYPE_OPTIONS,
  FRAGMENT_TYPE_VAR,
  NEW_COLLECTION_VALUE,
  USE_DATA_LFR_EDITABLES_VAR,
} from '../utils/constants';
import CustomGenerator from '../utils/custom-generator';
import { getCollectionChoices } from '../utils/get-collection-choices';

export default class FragmentGenerator extends CustomGenerator {
  async prompting(): Promise<void> {
    await this.ask({
      type: 'confirm',
      name: USE_DATA_LFR_EDITABLES_VAR,
      message: 'Use new data-lfr editable syntax?',
      default: true,
      when: !this.hasValue(USE_DATA_LFR_EDITABLES_VAR),
    });

    await this.ask([
      {
        type: 'input',
        name: FRAGMENT_NAME_VAR,
        message: FRAGMENT_NAME_MESSAGE,

        /** @param {string} name */
        validate: (name) =>
          name ? true : FRAGMENT_NAME_NON_EMPTY_ERROR_MESSAGE,
        when: !this.hasValue(FRAGMENT_NAME_VAR),
      },
      {
        type: 'list',
        name: FRAGMENT_TYPE_VAR,
        message: FRAGMENT_TYPE_MESSAGE,
        choices: FRAGMENT_TYPE_OPTIONS,
        default: this.getValue(FRAGMENT_TYPE_DEFAULT),
        when:
          !this.hasValue(FRAGMENT_TYPE_VAR) &&
          !this.getValue(USE_DATA_LFR_EDITABLES_VAR),
      },
    ]);

    this.setDefaultValue(
      FRAGMENT_SLUG_VAR,
      voca.slugify(this.getValue(FRAGMENT_NAME_VAR))
    );

    this.setDefaultValue(FRAGMENT_TYPE_VAR, FRAGMENT_TYPE_DEFAULT);

    await this.ask({
      type: 'list',
      name: FRAGMENT_COLLECTION_SLUG_VAR,
      message: FRAGMENT_COLLECTION_SLUG_MESSAGE,
      choices: getCollectionChoices(this.destinationRoot()),
      when: !this.hasValue(FRAGMENT_COLLECTION_SLUG_VAR),
    });
  }

  writing(): void {
    if (this.getValue(FRAGMENT_COLLECTION_SLUG_VAR) === NEW_COLLECTION_VALUE) {
      this.composeWith(
        {
          Generator: CollectionGenerator,
          path: require.resolve('../collection'),
        },
        {
          [FRAGMENT_NAME_VAR]: this.getValue(FRAGMENT_NAME_VAR),
          [FRAGMENT_TYPE_VAR]: this.getValue(FRAGMENT_TYPE_VAR),
          [USE_DATA_LFR_EDITABLES_VAR]: this.getValue(
            USE_DATA_LFR_EDITABLES_VAR
          ),
        }
      );
    } else {
      this.throwRequiredError(FRAGMENT_COLLECTION_SLUG_VAR);
      this.throwRequiredError(FRAGMENT_SLUG_VAR);

      const basePath = path.join(
        'src',
        this.getValue(FRAGMENT_COLLECTION_SLUG_VAR) || '',
        this.getValue(FRAGMENT_SLUG_VAR) || ''
      );

      this.copyTemplates(basePath, [
        'index.html',
        'main.js',
        'styles.css',
        'fragment.json',
        'configuration.json',
      ]);
    }
  }
}
