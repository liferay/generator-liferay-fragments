const CustomGenerator = require('../../utils/custom-generator');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const voca = require('voca');

const {
  COLLECTION_NAME_VAR,
  COLLECTION_SLUG_VAR,
  FRAGMENT_DESCRIPTION_MESSAGE,
  FRAGMENT_DESCRIPTION_VAR,
  FRAGMENT_NAME_MESSAGE,
  FRAGMENT_NAME_VAR,
  FRAGMENT_SLUG_VAR,
  SAMPLE_FRAGMENT_NAME
} = require('../../utils/constants');

module.exports = class extends CustomGenerator {
  async prompting() {
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

  writing() {
    const basePath = path.join(
      'src',
      this.getValue(COLLECTION_SLUG_VAR),
      this.getValue(FRAGMENT_SLUG_VAR)
    );

    this.copyTemplates(basePath, [
      'index.html',
      'main.js',
      'styles.css',
      'fragment.json'
    ]);
  }

  _getCollectionChoices(destinationRoot) {
    let choices = [];

    try {
      choices = glob
        .sync(`${destinationRoot}/src/*/collection.json`)
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

    return choices;
  }
};
