const fs = require('fs/promises');
const mpack = require('@granite-js/mpack');

(async function () {
  const rootDir = __dirname;
  const bundler = new mpack.Bundler({
    rootDir,
    cache: false,
    dev: false,
    metafile: false,
    buildConfig: $config,
  });

  const buildResult = await bundler.build();

  await fs.writeFile(buildResult.outfile, buildResult.bundle.source.text);
})();
