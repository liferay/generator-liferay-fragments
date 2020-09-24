const voca = require('voca');

const {
  ADD_SAMPLE_CONTENT_DEFAULT,
  ADD_SAMPLE_CONTENT_MESSAGE,
  ADD_SAMPLE_CONTENT_VAR,
  COLLECTION_DESCRIPTION_SAMPLE,
  COLLECTION_DESCRIPTION_VAR,
  COLLECTION_NAME_SAMPLE,
  COLLECTION_NAME_VAR,
  COLLECTION_SLUG_SAMPLE,
  FRAGMENT_COLLECTION_SLUG_VAR,
  FRAGMENT_NAME_SAMPLE,
  FRAGMENT_NAME_VAR,
  FRAGMENT_TYPE_DEFAULT,
  FRAGMENT_TYPE_VAR,
  MIN_LIFERAY_VERSION_SAMPLE,
  MIN_LIFERAY_VERSION_VAR,
  PROJECT_NAME_DEFAULT,
  PROJECT_NAME_MESSAGE,
  PROJECT_NAME_VAR,
  PROJECT_SLUG_VAR,
} = require('../utils/constants');
const CustomGenerator = require('../utils/custom-generator');
const { LOG_LEVEL, log } = require('../utils/log');

class AppGenerator extends CustomGenerator {
  /**
   * @inheritdoc
   */
  async prompting() {
    this._logWelcome();

    await this._ask([
      {
        type: 'input',
        name: PROJECT_NAME_VAR,
        message: PROJECT_NAME_MESSAGE,
        default: PROJECT_NAME_DEFAULT,
      },
      {
        type: 'confirm',
        name: ADD_SAMPLE_CONTENT_VAR,
        message: ADD_SAMPLE_CONTENT_MESSAGE,
        default: ADD_SAMPLE_CONTENT_DEFAULT,
      },
    ]);

    this._setValue(
      PROJECT_SLUG_VAR,
      voca.slugify(this._getValue(PROJECT_NAME_VAR))
    );

    this._isRequired(PROJECT_SLUG_VAR);

    this.destinationRoot(
      this.destinationPath(this._getValue(PROJECT_SLUG_VAR) || '')
    );
  }

  /**
   * @inheritdoc
   */
  writing() {
    log('Creating directory', { newLine: true });

    this._copyFiles(this.destinationRoot(), ['src/.gitkeep']);

    this._copyTemplates(this.destinationRoot(), [
      '.editorconfig',
      '.gitignore',
      '.yo-rc.json',
      'package.json',
      'README.md',
    ]);
  }

  /**
   * @inheritdoc
   */
  end() {
    if (this._getValue(ADD_SAMPLE_CONTENT_VAR)) {
      log('Adding sample content', { newLine: true });

      this.composeWith(require.resolve('../collection'), {
        [COLLECTION_NAME_VAR]: COLLECTION_NAME_SAMPLE,
        [COLLECTION_DESCRIPTION_VAR]: COLLECTION_DESCRIPTION_SAMPLE,

        [FRAGMENT_NAME_VAR]: FRAGMENT_NAME_SAMPLE,
        [FRAGMENT_TYPE_VAR]: FRAGMENT_TYPE_DEFAULT,
        [FRAGMENT_COLLECTION_SLUG_VAR]: COLLECTION_SLUG_SAMPLE,
        [MIN_LIFERAY_VERSION_VAR]: MIN_LIFERAY_VERSION_SAMPLE,
      });
    }

    setTimeout(() => {
      log('Done!', { newLine: true, level: LOG_LEVEL.success });
      log("You're ready to create fragments.");
    }, 100);
  }

  /**
   * Logs a welcome message to the console.
   */
  _logWelcome() {
    log(`
    __    ____________________  _____  __
    / /   /  _/ ____/ ____/ __ \\/   \\ \\/ /
  / /    / // /_  / __/ / /_/ / /| |\\  /
  / /____/ // __/ / /___/ _, _/ ___ |/ /
/_____/___/_/   /_____/_/ |_/_/  |_/_/
    `);
  }
}

module.exports = AppGenerator;
