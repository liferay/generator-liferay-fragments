import fs from 'fs';
import path from 'path';
import Generator from 'yeoman-generator';
import { IAnswerGroup, IQuestion } from 'yeoman-generator-types';

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
export default class CustomGenerator extends Generator {
  private readonly options: IAnswerGroup;

  private readonly _defaultValues: IAnswerGroup = {};
  private _answers: IAnswerGroup = {};

  constructor(args: any, options: any) {
    super(args, options);

    this._defaultValues = {};
    this._answers = {};

    // @ts-ignore

    if (!this.options) {
      this.options = {};
    }
  }

  async ask(question: IQuestion | IQuestion[]): Promise<IAnswerGroup> {
    const answers = await this.prompt(question);
    this._answers = { ...this._answers, ...answers };

    return this._answers;
  }

  copyFile(filePath: string, destinationPath: string): void {
    this.fs.copy(
      this.templatePath(filePath),
      this.destinationPath(destinationPath)
    );
  }

  copyFiles(basePath: string, filePaths: string[]): void {
    filePaths.forEach((filePath) =>
      this.copyFile(filePath, path.join(basePath, filePath))
    );
  }

  copyTemplate(templatePath: string, destinationPath: string): void {
    this.fs.copyTpl(
      this.templatePath(templatePath),
      this.destinationPath(destinationPath),
      {
        pkg: JSON.parse(
          fs.readFileSync(
            path.join(__dirname, '..', '..', 'package.json'),
            'utf-8'
          )
        ),

        ...this._defaultValues,
        ...this.options,
        ...this._answers,
      }
    );
  }

  copyTemplates(basePath: string, templatePaths: string[]): void {
    templatePaths.forEach((templatePath) =>
      this.copyTemplate(
        `${templatePath}.ejs`,
        path.join(basePath, templatePath)
      )
    );
  }

  deleteOption(key: string): void {
    delete this.options[key];
  }

  getValue(key: string): string | undefined {
    return (
      this._answers[key] ||
      this.options[key] ||
      this.config.get(key) ||
      this._defaultValues[key]
    );
  }

  hasOption(key: string): boolean {
    return this.options[key] !== 'undefined';
  }

  hasValue(key: string): boolean {
    return typeof this.getValue(key) !== 'undefined';
  }

  throwRequiredError(variable: string): void {
    const value = this.getValue(variable) || '';

    if (!value || !value.trim()) {
      this.env.error(new Error(`${variable} is required`));
    }
  }

  setDefaultValue(key: string, value: string): void {
    this._defaultValues[key] = value;
  }
}
