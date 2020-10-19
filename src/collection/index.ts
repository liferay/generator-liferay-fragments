import voca from 'voca';

import FragmentGenerator from '../fragment';
import FragmentCompositionGenerator from '../fragment-composition';
import {
  COLLECTION_DESCRIPTION_DEFAULT,
  COLLECTION_DESCRIPTION_VAR,
  COLLECTION_NAME_VAR,
  COLLECTION_SLUG_VAR,
  FRAGMENT_COLLECTION_SLUG_VAR,
  FRAGMENT_COMPOSITION_NAME_VAR,
  FRAGMENT_NAME_VAR,
  FRAGMENT_TYPE_VAR,
  USE_DATA_LFR_EDITABLES_VAR,
} from '../utils/constants';
import CustomGenerator from '../utils/custom-generator';

export default class CollectionGenerator extends CustomGenerator {
  async prompting(): Promise<void> {
    await this.ask([
      {
        type: 'input',
        name: COLLECTION_NAME_VAR,
        message: 'Collection name',
        validate: (name) => (name ? true : 'Collection name must not be empty'),
        when: !this.hasValue(COLLECTION_NAME_VAR),
      },
      {
        type: 'input',
        name: COLLECTION_DESCRIPTION_VAR,
        message: 'Collection description',
        when: !this.hasValue(COLLECTION_DESCRIPTION_VAR),
      },
    ]);

    this.setDefaultValue(
      COLLECTION_DESCRIPTION_VAR,
      COLLECTION_DESCRIPTION_DEFAULT
    );

    this.setDefaultValue(
      COLLECTION_SLUG_VAR,
      voca.slugify(this.getValue(COLLECTION_NAME_VAR))
    );

    this.throwRequiredError(COLLECTION_SLUG_VAR);
  }

  writing(): void {
    this.copyTemplates(`src/${this.getValue(COLLECTION_SLUG_VAR)}`, [
      'collection.json',
    ]);
  }

  end(): void {
    const fragmentName = this.getValue(FRAGMENT_NAME_VAR);
    const fragmentCompositionName = this.getValue(
      FRAGMENT_COMPOSITION_NAME_VAR
    );

    if (fragmentName) {
      this.composeWith(
        {
          Generator: FragmentGenerator,
          path: require.resolve('../fragment'),
        },
        {
          [FRAGMENT_NAME_VAR]: fragmentName,
          [FRAGMENT_TYPE_VAR]: this.getValue(FRAGMENT_TYPE_VAR),
          [FRAGMENT_COLLECTION_SLUG_VAR]: this.getValue(COLLECTION_SLUG_VAR),
          [USE_DATA_LFR_EDITABLES_VAR]: this.getValue(
            USE_DATA_LFR_EDITABLES_VAR
          ),
        }
      );
    }

    if (fragmentCompositionName) {
      this.composeWith(
        {
          Generator: FragmentCompositionGenerator,
          path: require.resolve('../fragment-composition'),
        },
        {
          [FRAGMENT_COMPOSITION_NAME_VAR]: fragmentCompositionName,
          [FRAGMENT_COLLECTION_SLUG_VAR]: this.getValue(COLLECTION_SLUG_VAR),
        }
      );
    }
  }
}
