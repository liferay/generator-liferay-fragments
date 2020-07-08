const CustomGenerator = require('../../utils/custom-generator');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const semver = require('semver');
const voca = require('voca');

const {
  DATA_LFR_SUPPORTED,
  DATA_LFR_SUPPORTED_MIN_VERSION,
  FRAGMENT_COLLECTION_SLUG_MESSAGE,
  FRAGMENT_COLLECTION_SLUG_VAR,
  FRAGMENT_NAME_MESSAGE,
  FRAGMENT_NAME_NON_EMPTY_ERROR_MESSAGE,
  FRAGMENT_NAME_VAR,
  FRAGMENT_TYPE_DEFAULT,
  FRAGMENT_TYPE_MESSAGE,
  FRAGMENT_TYPE_OPTIONS,
  FRAGMENT_TYPE_VAR,
  FRAGMENT_SLUG_VAR,
  MIN_LIFERAY_VERSION_MESSAGE,
  MIN_LIFERAY_VERSION_MESSAGE_ERROR_MESSAGE,
  MIN_LIFERAY_VERSION_VAR,
  NEW_COLLECTION_MESSAGE,
  NEW_COLLECTION_SHORT,
  NEW_COLLECTION_VALUE,
  USE_SCSS_DEFAULT,
  USE_SCSS_MESSAGE,
  USE_SCSS_VAR
} = require('../../utils/constants');

module.exports = class extends CustomGenerator {
  /**
   * @inheritdoc
   */
  async prompting() {
    await this._askLiferayVersion();
    await this._askFragmentData();
    await this._askCollection();
  }

  /**
   * @inheritdoc
   */
  writing() {
    if (this._getValue(FRAGMENT_COLLECTION_SLUG_VAR) === NEW_COLLECTION_VALUE) {
      this.composeWith(require.resolve('../collection'), {
        [FRAGMENT_NAME_VAR]: this._getValue(FRAGMENT_NAME_VAR),
        [MIN_LIFERAY_VERSION_VAR]: this._getValue(MIN_LIFERAY_VERSION_VAR),
        [USE_SCSS_VAR]: this._getValue(USE_SCSS_VAR)
      });
    } else {
      this._isRequired(FRAGMENT_COLLECTION_SLUG_VAR);
      this._isRequired(FRAGMENT_SLUG_VAR);
      this._isRequired(MIN_LIFERAY_VERSION_VAR);

      const styleFileName = this._getValue(USE_SCSS_VAR)
        ? 'styles.scss'
        : 'styles.css';
      const basePath = path.join(
        'src',
        this._getValue(FRAGMENT_COLLECTION_SLUG_VAR) || '',
        this._getValue(FRAGMENT_SLUG_VAR) || ''
      );

      this._copyTemplates(basePath, [
        'index.html',
        'main.js',
        styleFileName,
        'fragment.json',
        'configuration.json'
      ]);
    }
  }

  /**
   * Request a collection for the created fragment.
   * Available options are fetched in _getCollectionChoices method.
   * @see _getCollectionChoices
   */
  async _askCollection() {
    await this._ask({
      type: 'list',
      name: FRAGMENT_COLLECTION_SLUG_VAR,
      message: FRAGMENT_COLLECTION_SLUG_MESSAGE,
      choices: this._getCollectionChoices(),
      when: !this._hasValue(FRAGMENT_COLLECTION_SLUG_VAR)
    });
  }

  /**
   * Requests fragment information and sets the fragment slug.
   */
  async _askFragmentData() {
    await this._ask([
      {
        type: 'input',
        name: FRAGMENT_NAME_VAR,
        message: FRAGMENT_NAME_MESSAGE,
        /** @param {string} name */
        validate: name => (name ? true : FRAGMENT_NAME_NON_EMPTY_ERROR_MESSAGE),
        when: !this._hasValue(FRAGMENT_NAME_VAR)
      },
      {
        type: 'list',
        name: FRAGMENT_TYPE_VAR,
        message: FRAGMENT_TYPE_MESSAGE,
        choices: FRAGMENT_TYPE_OPTIONS,
        default: this._getValue(FRAGMENT_TYPE_DEFAULT),
        when:
          !this._hasValue(FRAGMENT_TYPE_VAR) &&
          !this._getValue(DATA_LFR_SUPPORTED)
      },
      {
        type: 'confirm',
        name: USE_SCSS_VAR,
        message: USE_SCSS_MESSAGE,
        default: USE_SCSS_DEFAULT,
        when: !this._hasValue(USE_SCSS_VAR)
      }
    ]);

    this._setValue(
      FRAGMENT_SLUG_VAR,
      voca.slugify(this._getValue(FRAGMENT_NAME_VAR))
    );

    this._setValue(FRAGMENT_TYPE_VAR, FRAGMENT_TYPE_DEFAULT);
  }

  async _askLiferayVersion() {
    const previousMinLiferayVersion = this._getValue(MIN_LIFERAY_VERSION_VAR);

    await this._ask({
      type: 'input',
      name: MIN_LIFERAY_VERSION_VAR,
      message: MIN_LIFERAY_VERSION_MESSAGE,
      /** @param {string} name */
      validate: version =>
        semver.valid(version)
          ? true
          : MIN_LIFERAY_VERSION_MESSAGE_ERROR_MESSAGE,
      when: !this._hasValue(MIN_LIFERAY_VERSION_VAR)
    });

    if (!previousMinLiferayVersion) {
      this.config.set(
        MIN_LIFERAY_VERSION_VAR,
        `${this._getValue(MIN_LIFERAY_VERSION_VAR)}`
      );
    }

    this._setValue(
      DATA_LFR_SUPPORTED,
      // @ts-ignore
      semver.gte(
        `${this._getValue(MIN_LIFERAY_VERSION_VAR)}`,
        DATA_LFR_SUPPORTED_MIN_VERSION
      )
    );
  }

  /**
   * Read the list of created collections from the project structure
   * and returns a list of choices. It also adds an extra 'new collection'
   * option for adding new collections.
   * @return {import('yeoman-generator-types').IChoice[]} List of
   *  choices parseable by yeoman's ask method.
   */
  _getCollectionChoices() {
    /** @type {import('yeoman-generator-types').IChoice[]} */
    let choices = [];

    try {
      choices = glob
        .sync(`${this.destinationRoot()}/src/*/collection.json`)
        .map(collectionJSON => {
          const collectionName = JSON.parse(
            fs.readFileSync(collectionJSON, 'utf-8')
          ).name;

          const collectionSlug = path.basename(
            path.resolve(`${collectionJSON}/..`)
          );

          return {
            name: collectionName,
            value: collectionSlug,
            short: `(${collectionSlug})`
          };
        });
    } catch (error) {}

    choices.push({
      name: NEW_COLLECTION_MESSAGE,
      value: NEW_COLLECTION_VALUE,
      short: NEW_COLLECTION_SHORT
    });

    return choices;
  }
};
