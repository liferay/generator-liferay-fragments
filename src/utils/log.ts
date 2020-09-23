const chalk = require('chalk');

type LogLevel = 'info' | 'success' | 'error';

interface Options {
  newLine?: boolean;
  indent?: boolean;
  level?: LogLevel;
  data?: string;
  description?: string;
}

export function log(message: string, options: Options = {}) {
  if (process.env.NODE_ENV !== 'test') {
    let _message = message;

    switch (options.level) {
      case 'success':
        _message = chalk.green(_message);
        break;
      case 'error':
        _message = chalk.bold(chalk.red(_message));
        break;
      default:
        _message = chalk.reset(_message);
        break;
    }

    if (options.newLine || options.description) {
      _message = `\n${_message}`;
    }

    if (options.indent) {
      _message = _message
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
    }

    if (options.data) {
      _message = `${_message} ${chalk.bold(options.data)}`;
    }

    console.log(_message);

    if (options.description) {
      console.log(options.description);
    }
  }
}
