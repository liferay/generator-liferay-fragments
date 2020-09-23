/* eslint-disable no-console */

const chalk = require('chalk');

/**
 * @type {{ [key: string]: 'LOG_LEVEL_INFO'|'LOG_LEVEL_SUCCESS'|'LOG_LEVEL_ERROR' }}
 */
const LOG_LEVEL = {
  info: 'LOG_LEVEL_INFO',
  success: 'LOG_LEVEL_SUCCESS',
  error: 'LOG_LEVEL_ERROR'
};

/**
 * Logs a simple message to the console
 * @param {string} message Message content
 * @param {object} [options]
 * @param {boolean} [options.newLine=false]
 * @param {boolean} [options.indent=false]
 * @param {'LOG_LEVEL_INFO'|'LOG_LEVEL_SUCCESS'|'LOG_LEVEL_ERROR'} [options.level=LOG_LEVEL.info]
 * @param {string} [options.data='']
 * @param {string} [options.description='']
 */
function log(message, options = {}) {
  if (process.env.NODE_ENV !== 'test') {
    let _message = message;

    switch (options.level) {
      case LOG_LEVEL.success:
        _message = chalk.green(_message);
        break;
      case LOG_LEVEL.error:
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
        .map(line => `  ${line}`)
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

module.exports = {
  LOG_LEVEL,
  log
};
