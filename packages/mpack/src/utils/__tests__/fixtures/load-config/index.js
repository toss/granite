const mpack = require('@granite-js/mpack');

(async function () {
  const config = await mpack.loadConfig({ rootDir: __dirname });

  console.log(JSON.stringify(config));
})();
