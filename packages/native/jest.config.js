const sharedConfig = require('../jest.config.js');

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  ...sharedConfig,
  rootDir: __dirname,
};
