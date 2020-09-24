const path = require('path');

const {
  PAGE_TEMPLATE_NAME_MESSAGE,
  PAGE_TEMPLATE_NAME_NON_EMPTY_ERROR_MESSAGE,
  PAGE_TEMPLATE_NAME_VAR,
  PAGE_TEMPLATE_SLUG_VAR,
  PAGE_TEMPLATE_TYPE_DEFAULT,
  PAGE_TEMPLATE_TYPE_MESSAGE,
  PAGE_TEMPLATE_TYPE_OPTIONS,
  PAGE_TEMPLATE_TYPE_VAR,
} = require('../utils/constants');
const { default: CustomGenerator } = require('../utils/custom-generator');

module.exports = class extends CustomGenerator {
  /**
   * @inheritdoc
   */
  async prompting() {
    await this._askPageTemplateData();
  }

  /**
   * @inheritdoc
   */
  writing() {
    this.throwRequiredError(PAGE_TEMPLATE_SLUG_VAR);

    const basePath = path.join(
      'src',
      this.getValue(PAGE_TEMPLATE_SLUG_VAR) || ''
    );

    const pageTemplateType = this.getValue(PAGE_TEMPLATE_TYPE_VAR) || '';

    this.copyTemplate(
      path.join(pageTemplateType, 'page-definition.json.ejs'),
      path.join(basePath, 'page-definition.json')
    );

    this.copyTemplate(
      path.join(pageTemplateType, `${pageTemplateType}.json.ejs`),
      path.join(basePath, `${pageTemplateType}.json`)
    );
  }

  /**
   * Requests fragment information and sets the fragment slug.
   */
  async _askPageTemplateData() {
    await this.ask([
      {
        type: 'list',
        name: PAGE_TEMPLATE_TYPE_VAR,
        message: PAGE_TEMPLATE_TYPE_MESSAGE,
        choices: PAGE_TEMPLATE_TYPE_OPTIONS,
        default: this.getValue(PAGE_TEMPLATE_TYPE_DEFAULT),
        when: !this.hasValue(PAGE_TEMPLATE_TYPE_VAR),
      },
      {
        type: 'input',
        name: PAGE_TEMPLATE_NAME_VAR,
        message: PAGE_TEMPLATE_NAME_MESSAGE,

        /** @param {string} name */
        validate: (name) =>
          name ? true : PAGE_TEMPLATE_NAME_NON_EMPTY_ERROR_MESSAGE,
        when: !this.hasValue(PAGE_TEMPLATE_NAME_VAR),
      },
    ]);

    this.setValue(
      PAGE_TEMPLATE_SLUG_VAR,
      (this.getValue(PAGE_TEMPLATE_NAME_VAR) || '')
        .replace(/\s+/g, '-')
        .toLocaleLowerCase()
    );

    this.setValue(PAGE_TEMPLATE_TYPE_VAR, PAGE_TEMPLATE_TYPE_DEFAULT);
  }
};
