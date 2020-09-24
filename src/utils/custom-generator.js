const path = require('path');
const Generator = require('yeoman-generator');

/**
 * Custom Generator that extends Yeoman's Generator class
 * adding extra shortcuts.
 *
 * It maintains a three objects with the information collected from users:
 * - this.options: Given by yeoman, console parameters
 * - this.defaultValues: Initially empty, may be overriden with setValue method,
 *   values used if there is no answer and no option has been given.
 * - this.answers: Initially empty, it is filled with the answers given
 *   by asking questions.
 *
 * @see Generator
 */
class CustomGenerator extends Generator {
  /**
   * @param {any} args
   * @param {any} options
   */
  constructor(args, options) {
    super(args, options);

    /** @type {import('yeoman-generator-types').IAnswerGroup} */
    this.defaultValues = {};

    /** @type {import('yeoman-generator-types').IAnswerGroup} */
    this.answers = {};

    /** @type {import('yeoman-generator-types').IAnswerGroup} */
    this.options = this.options || {};
  }

  /**
   * Prompts the given question(s) to the user and merges
   * the response with this.answers object.
   * @param {import('yeoman-generator-types').IQuestion|import('yeoman-generator-types').IQuestion[]} question
   * @return {Promise<import('yeoman-generator-types').IAnswerGroup>} Merged answers
   */
  async _ask(question) {
    const answers = await this.prompt(question);
    this.answers = { ...this.answers, ...answers};

    return this.answers;
  }

  /**
   * Copies the given file to the given destination, using
   * this.templatePath and this.destinationPath internally.
   * @param {string} filePath
   * @param {string} destinationPath
   */
  _copyFile(filePath, destinationPath) {
    this.fs.copy(
      this.templatePath(filePath),
      this.destinationPath(destinationPath)
    );
  }

  /**
   * Copy a set of files to a basePath.
   * `[filePath]` -> `[basePath]/[filePath]`
   * @param {string} basePath Basepath where templates will be copied
   * @param {string[]} filePaths List of templates to be copied
   */
  _copyFiles(basePath, filePaths) {
    filePaths.forEach(filePath =>
      this._copyFile(filePath, path.join(basePath, filePath))
    );
  }

  /**
   * Copies the given template to the given destination, using
   * this.templatePath and this.destinationPath internally.
   * All templates receive the data collected from this generator.
   * @param {string} templatePath
   * @param {string} destinationPath
   */
  _copyTemplate(templatePath, destinationPath) {
    this.fs.copyTpl(
      this.templatePath(templatePath),
      this.destinationPath(destinationPath),
      { ...this.defaultValues, ...this.options, ...this.answers}
    );
  }

  /**
   * Copy a set of templates to a basePath.
   * For each template path produces the following transformation
   * `[templatePath].ejs` -> `[basePath]/[templatePath]`
   * @param {string} basePath Basepath where templates will be copied
   * @param {string[]} templatePaths List of templates to be copied
   */
  _copyTemplates(basePath, templatePaths) {
    templatePaths.forEach(templatePath =>
      this._copyTemplate(
        `${templatePath}.ejs`,
        path.join(basePath, templatePath)
      )
    );
  }

  /**
   * Returns a value for the given key, looking in answers, then options and
   * finally defaultValues.
   * @param {string} key Value key
   * @return {string|undefined} Found value, undefined if none
   */
  _getValue(key) {
    return (
      this.answers[key] ||
      this.options[key] ||
      this.config.get(key) ||
      this.defaultValues[key]
    );
  }

  /**
   * Returns if value for the given key is setted either in answers, or options
   * or defaultValues.
   * @param {string} key Value key
   * @return {boolean} Wether the value is defined or not
   */
  _hasValue(key) {
    return (
      key in this.answers ||
      key in this.options ||
      Boolean(this.config.get(key)) ||
      key in this.defaultValues
    );
  }

  /**
   * Checks if the given variable is available and stops generator
   * execution if not.
   * @param {string} variable Variable name
   */
  _isRequired(variable) {
    const value = this._getValue(variable) || '';

    if (!value || !value.trim()) {
      this.env.error(new Error(`${variable} is required`));
    }
  }

  /**
   * Stores the given value inside the given key inside defaultValues
   * @param {string} key
   * @param {string} value
   */
  _setValue(key, value) {
    this.defaultValues[key] = value;
  }
}

module.exports = CustomGenerator;
