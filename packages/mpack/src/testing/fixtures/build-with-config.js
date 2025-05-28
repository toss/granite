const fs = require('fs/promises');
const mpack = require('@granite-js/mpack');

(async function () {
  const rootDir = __dirname;

  const bundler = new mpack.Bundler({
    rootDir,
    appName: 'test',
    cache: false,
    dev: false,
    metafile: false,
    env: 'alpha',
    buildConfig: $config,
    services: {
      sentry: {
        enabled: false,
      },
    },
  });

  const buildResult = await bundler.build();

  await fs.writeFile(buildResult.outfile, buildResult.bundle.source.text);
})();
