import path from 'path';
import semver from 'semver';
import voca from 'voca';

import CollectionGenerator from '../collection';
import {
  DATA_LFR_SUPPORTED,
  DATA_LFR_SUPPORTED_MIN_VERSION,
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
  MIN_LIFERAY_VERSION_MESSAGE,
  MIN_LIFERAY_VERSION_MESSAGE_ERROR_MESSAGE,
  MIN_LIFERAY_VERSION_VAR,
  NEW_COLLECTION_VALUE,
} from '../utils/constants';
import CustomGenerator from '../utils/custom-generator';
import { getCollectionChoices } from '../utils/get-collection-choices';

export default class FragmentGenerator extends CustomGenerator {
  async prompting(): Promise<void> {
    const previousMinLiferayVersion = this.getValue(MIN_LIFERAY_VERSION_VAR);

    await this.ask({
      type: 'input',
      name: MIN_LIFERAY_VERSION_VAR,
      message: MIN_LIFERAY_VERSION_MESSAGE,
      validate: (version) =>
        semver.valid(version)
          ? true
          : MIN_LIFERAY_VERSION_MESSAGE_ERROR_MESSAGE,
      when: !this.hasValue(MIN_LIFERAY_VERSION_VAR),
    });

    if (!previousMinLiferayVersion) {
      this.config.set(
        MIN_LIFERAY_VERSION_VAR,
        `${this.getValue(MIN_LIFERAY_VERSION_VAR)}`
      );
    }

    this.setDefaultValue(
      DATA_LFR_SUPPORTED,

      // @ts-ignore

      semver.gte(
        `${this.getValue(MIN_LIFERAY_VERSION_VAR)}`,
        DATA_LFR_SUPPORTED_MIN_VERSION
      )
    );

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
          !this.getValue(DATA_LFR_SUPPORTED),
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
          [MIN_LIFERAY_VERSION_VAR]: this.getValue(MIN_LIFERAY_VERSION_VAR),
        }
      );
    } else {
      this.throwRequiredError(FRAGMENT_COLLECTION_SLUG_VAR);
      this.throwRequiredError(FRAGMENT_SLUG_VAR);
      this.throwRequiredError(MIN_LIFERAY_VERSION_VAR);

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
