const { gray, blue, yellow, red } = require('ansis');
const { nodeEnv } = require('../config/config.js');

function formatMessage(level, color, ...args) {
  const timestamp = new Date().toISOString();
  return `${gray(`[${timestamp}]`)} ${color(`[${level.toUpperCase()}]`)} ${args.join(' ')}`;
}

global.log = {
  info: (...args) => {
    if (nodeEnv !== 'production') {
      console.log(formatMessage('info', blue, ...args));
    }
  },
  warn: (...args) => {
    if (nodeEnv !== 'production') {
      console.warn(formatMessage('warn', yellow, ...args));
    }
  },
  error: (...args) => {
    console.error(formatMessage('error', red, ...args));
  },
};
