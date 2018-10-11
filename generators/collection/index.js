const CustomGenerator = require('../../utils/custom-generator');
const { SAMPLE_COLLECTION_NAME } = require('../../utils/constants');
const voca = require('voca');

const {
  COLLECTION_DESCRIPTION_DEFAULT,
  COLLECTION_DESCRIPTION_MESSAGE,
  COLLECTION_DESCRIPTION_VAR,
  COLLECTION_NAME_MESSAGE,
  COLLECTION_NAME_VAR,
  COLLECTION_SLUG_VAR
} = require('../../utils/constants');

module.exports = class extends CustomGenerator {
  async prompting() {
    await this.ask([
      {
        type: 'input',
        name: COLLECTION_NAME_VAR,
        message: COLLECTION_NAME_MESSAGE,
        when: !this.getValue(COLLECTION_NAME_VAR)
      },
      {
        type: 'input',
        name: COLLECTION_DESCRIPTION_VAR,
        message: COLLECTION_DESCRIPTION_MESSAGE,
        when: this.getValue(COLLECTION_NAME_VAR) !== SAMPLE_COLLECTION_NAME
      }
    ]);

    this.setValue(COLLECTION_NAME_VAR, SAMPLE_COLLECTION_NAME);
    this.setValue(COLLECTION_DESCRIPTION_VAR, COLLECTION_DESCRIPTION_DEFAULT);

    this.setValue(
      COLLECTION_SLUG_VAR,
      voca.slugify(this.getValue(COLLECTION_NAME_VAR))
    );
  }

  writing() {
    this.copyTemplates(`src/${this.getValue(COLLECTION_SLUG_VAR)}`, [
      'collection.json'
    ]);
  }
};
