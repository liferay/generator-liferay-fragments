const CustomGenerator = require('../../utils/custom-generator');
const voca = require('voca');

const {
  ADD_SAMPLE_CONTENT_DEFAULT,
  ADD_SAMPLE_CONTENT_MESSAGE,
  ADD_SAMPLE_CONTENT_VAR,
  COLLECTION_NAME_SAMPLE,
  COLLECTION_NAME_VAR,
  COLLECTION_SLUG_SAMPLE,
  COLLECTION_SLUG_VAR,
  FRAGMENT_NAME_SAMPLE,
  FRAGMENT_NAME_VAR,
  REPOSITORY_NAME_DEFAULT,
  REPOSITORY_NAME_MESSAGE,
  REPOSITORY_NAME_VAR,
  REPOSITORY_SLUG_VAR
} = require('../../utils/constants');

class AppGenerator extends CustomGenerator {
  async prompting() {
    await this.ask([
      {
        type: 'input',
        name: REPOSITORY_NAME_VAR,
        message: REPOSITORY_NAME_MESSAGE,
        default: REPOSITORY_NAME_DEFAULT
      },
      {
        type: 'confirm',
        name: ADD_SAMPLE_CONTENT_VAR,
        message: ADD_SAMPLE_CONTENT_MESSAGE,
        default: ADD_SAMPLE_CONTENT_DEFAULT
      }
    ]);

    this.setValue(
      REPOSITORY_SLUG_VAR,
      voca.slugify(this.getValue(REPOSITORY_NAME_VAR))
    );

    this.destinationRoot(this.destinationPath(this.data.repositorySlug));
  }

  writing() {
    this.copyTemplates(this.destinationRoot(), [
      '.editorconfig',
      '.eslintrc',
      '.gitignore',
      '.yo-rc.json',
      'package.json',
      'README.md'
    ]);
  }

  end() {
    if (this.getValue(ADD_SAMPLE_CONTENT_VAR)) {
      this.composeWith(require.resolve('../collection'), {
        [COLLECTION_NAME_VAR]: COLLECTION_NAME_SAMPLE
      });

      this.composeWith(require.resolve('../fragment'), {
        [COLLECTION_SLUG_VAR]: COLLECTION_SLUG_SAMPLE,
        [FRAGMENT_NAME_VAR]: FRAGMENT_NAME_SAMPLE
      });
    }
  }
}

module.exports = AppGenerator;
