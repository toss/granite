const { readFileSync } = require('node:fs');

exports.handler = async () => ({
  version: process.version,
  platform: process.platform,
  arch: process.arch,
  uid: process.getuid(),
  osRelease: readFileSync('/etc/os-release', 'utf8'),
  executionEnvironment: process.env.AWS_EXECUTION_ENV,
});
