const esbuild = require('esbuild');
const { plugins } = require('@granite-js/mpack');

(async function () {
  await esbuild.build({
    entryPoints: ['./index.js'],
    outfile: process.env.OUTFILE,
    bundle: true,
    plugins: [
      plugins.transformPlugin({
        context: {
          id: 'test',
          buildOptions: {
            rootDir: __dirname,
            dev: false,
            cache: false,
          },
          buildConfig: {
            esbuild: {
              prelude: ['initialize.js'],
            },
          },
        },
      }),
    ],
  });
})();
