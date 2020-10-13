import path from 'path';

import CustomGenerator from '../utils/custom-generator';

const PAGE_TEMPLATE_NAME_VAR = 'pageTemplateName';
const PAGE_TEMPLATE_SLUG_VAR = 'pageTemplateSlug';
const PAGE_TEMPLATE_TYPE_VAR = 'pageTemplateType';

export default class PageTemplateGenerator extends CustomGenerator {
  async prompting(): Promise<void> {
    await this.ask([
      {
        type: 'list',
        name: PAGE_TEMPLATE_TYPE_VAR,
        message: 'Page Template type',
        choices: [
          { name: 'Display Page Template', value: 'display-page-template' },
          { name: 'Page Template', value: 'page-template' },
          { name: 'Master Page', value: 'master-page' },
        ],
        default: 'page-template',
        when: !this.hasValue(PAGE_TEMPLATE_TYPE_VAR),
      },
      {
        type: 'input',
        name: PAGE_TEMPLATE_NAME_VAR,
        message: 'Page Template name',
        validate: (name) =>
          name ? true : 'Page Template name must not be empty',
        when: !this.hasValue(PAGE_TEMPLATE_NAME_VAR),
      },
    ]);

    this.setValue(
      PAGE_TEMPLATE_SLUG_VAR,
      (this.getValue(PAGE_TEMPLATE_NAME_VAR) || '')
        .replace(/\s+/g, '-')
        .toLocaleLowerCase()
    );
  }

  writing(): void {
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
}
