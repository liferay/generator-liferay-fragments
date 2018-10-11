const CustomGenerator = require('../../utils/custom-generator');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const voca = require('voca');

const {
  COLLECTION_NAME_VAR,
  COLLECTION_SLUG_VAR,
  FRAGMENT_COLLECTION_SLUG_MESSAGE,
  FRAGMENT_COLLECTION_SLUG_VAR,
  FRAGMENT_DESCRIPTION_MESSAGE,
  FRAGMENT_DESCRIPTION_VAR,
  FRAGMENT_NAME_MESSAGE,
  FRAGMENT_NAME_SAMPLE,
  FRAGMENT_NAME_VAR,
  FRAGMENT_SLUG_VAR,
  NEW_COLLECTION_MESSAGE,
  NEW_COLLECTION_SHORT,
  NEW_COLLECTION_VALUE,
  SAMPLE_FRAGMENT_NAME
} = require('../../utils/constants');

module.exports = class extends CustomGenerator {
  async prompting() {
    if (this.getValue(FRAGMENT_NAME_VAR) !== FRAGMENT_NAME_SAMPLE) {
      await this._askCollection();
    }

    await this._askFragmentData();
  }

  writing() {
    const basePath = path.join(
      'src',
      this.getValue(FRAGMENT_COLLECTION_SLUG_VAR),
      this.getValue(FRAGMENT_SLUG_VAR)
    );

    this.copyTemplates(basePath, [
      'index.html',
      'main.js',
      'styles.css',
      'fragment.json'
    ]);
  }

  async _askCollection() {
    await this.ask({
      type: 'list',
      name: FRAGMENT_COLLECTION_SLUG_VAR,
      message: FRAGMENT_COLLECTION_SLUG_MESSAGE,
      choices: this._getCollectionChoices()
    });
  }

  async _askFragmentData() {
    await this.ask([
      {
        type: 'input',
        name: FRAGMENT_NAME_VAR,
        message: FRAGMENT_NAME_MESSAGE,
        when: !this.getValue(FRAGMENT_NAME_VAR)
      },
      {
        type: 'input',
        name: FRAGMENT_DESCRIPTION_VAR,
        message: FRAGMENT_DESCRIPTION_MESSAGE,
        when: this.getValue(FRAGMENT_DESCRIPTION_VAR) !== SAMPLE_FRAGMENT_NAME
      }
    ]);

    this.setValue(
      COLLECTION_SLUG_VAR,
      voca.slugify(this.getValue(COLLECTION_NAME_VAR))
    );

    this.setValue(
      FRAGMENT_SLUG_VAR,
      voca.slugify(this.getValue(FRAGMENT_NAME_VAR))
    );
  }

  _getCollectionChoices() {
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
