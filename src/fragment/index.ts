import fs from 'fs';
import glob from 'glob';
import path from 'path';
import semver from 'semver';
import voca from 'voca';

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
  NEW_COLLECTION_MESSAGE,
  NEW_COLLECTION_SHORT,
  NEW_COLLECTION_VALUE,
} from '../utils/constants';
import CustomGenerator from '../utils/custom-generator';

export default class FragmentGenerator extends CustomGenerator {
  async prompting(): Promise<void> {
    await this._askLiferayVersion();
    await this._askFragmentData();
    await this._askCollection();
  }

  writing(): void {
    if (this.getValue(FRAGMENT_COLLECTION_SLUG_VAR) === NEW_COLLECTION_VALUE) {
      this.composeWith(require.resolve('../collection'), {
        [FRAGMENT_NAME_VAR]: this.getValue(FRAGMENT_NAME_VAR),
        [MIN_LIFERAY_VERSION_VAR]: this.getValue(MIN_LIFERAY_VERSION_VAR),
      });
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

  private async _askCollection() {
    await this.ask({
      type: 'list',
      name: FRAGMENT_COLLECTION_SLUG_VAR,
      message: FRAGMENT_COLLECTION_SLUG_MESSAGE,
      choices: this._getCollectionChoices(),
      when: !this.hasValue(FRAGMENT_COLLECTION_SLUG_VAR),
    });
  }

  private async _askFragmentData() {
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
  }

  private async _askLiferayVersion() {
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
  }

  private _getCollectionChoices(): Array<{
    name: string;
    value: string;
    short: string;
  }> {
    let choices: Array<{ name: string; value: string; short: string }> = [];

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
