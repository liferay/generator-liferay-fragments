declare module 'yeoman-generator-types' {
  interface IChoice {
    name: string;
    value: string;
    short?: string;
  }

  interface IArgumentOptions {
    type: StringConstructor;
    required?: boolean;
  }

  interface IAnswerGroup {
    [key: string]: string;
  }

  interface IBasicQuestion {
    type: 'input' | 'password' | 'list' | 'confirm';
    name: string;
    message: string;
    default?: string | boolean;
    when?: boolean;
    validate?: (val: string) => boolean | string;
  }

  interface IListQuestion extends IBasicQuestion {
    type: 'list';
    choices: IChoice[];
  }

  type IQuestion = IBasicQuestion | IListQuestion;
}

declare module 'yeoman-generator' {
  import {
    IArgumentOptions,
    IQuestion,
    IAnswerGroup
  } from 'yeoman-generator-types';

  class Generator {
    env: {
      error(error: Error): void;
    };

    fs: {
      copy(filePath: string, destinationPath: string): void;

      copyTpl(
        templatePath: string,
        destinationPath: string,
        data?: { [key: string]: string }
      ): void;
    };

    constructor(args: any, options: any);

    destinationRoot(subPath?: string): string;
    destinationPath(subPath?: string): string;
    templatePath(subPath?: string): string;

    argument(arg: string, options: IArgumentOptions): void;
    prompt(question: IQuestion | IQuestion[]): IAnswerGroup;

    npmInstall(
      libs: string[],
      options: {
        progress: boolean;
        saveDev: boolean;
        loglevel: 'silent';
      }
    ): void;

    composeWith(
      generatorPath: string,
      generatorOptions: { [key: string]: any }
    ): void;
  }

  export = Generator;
}
