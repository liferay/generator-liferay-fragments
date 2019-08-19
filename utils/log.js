/* eslint-disable no-console */

const chalk = require('chalk');

/**
 * Logs a simple message to the console
 * @param {string} message Message content
 * @param {object} [options]
 * @param {boolean} [options.newLine=false]
 * @param {boolean} [options.indent=false]
 * @param {'info'|'success'|'error'} [options.level='info']
 * @param {string} [options.data='']
 * @param {string} [options.description='']
 */
function log(message, options = {}) {
  if (process.env.NODE_ENV !== 'test' || options.level === 'error') {
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
      _message = `  ${_message}`;
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

module.exports = {
  log
};
