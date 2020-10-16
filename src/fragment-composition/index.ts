import path from 'path';
import voca from 'voca';

import CollectionGenerator from '../collection';
import {
  FRAGMENT_COLLECTION_SLUG_MESSAGE,
  FRAGMENT_COLLECTION_SLUG_VAR,
  FRAGMENT_COMPOSITION_NAME_VAR,
  FRAGMENT_SLUG_VAR,
  NEW_COLLECTION_VALUE,
} from '../utils/constants';
import CustomGenerator from '../utils/custom-generator';
import { getCollectionChoices } from '../utils/get-collection-choices';

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

    this.setDefaultValue(
      FRAGMENT_SLUG_VAR,
      voca.slugify(this.getValue(FRAGMENT_COMPOSITION_NAME_VAR))
    );

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
          [FRAGMENT_COMPOSITION_NAME_VAR]: this.getValue(
            FRAGMENT_COMPOSITION_NAME_VAR
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
        'fragment-composition.json',
        'definition.json',
      ]);
    }
  }
}
