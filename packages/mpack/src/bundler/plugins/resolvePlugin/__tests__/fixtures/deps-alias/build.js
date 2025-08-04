const esbuild = require('esbuild');
const { plugins } = require('@granite-js/mpack');

esbuild.build({
  entryPoints: ['./index.js'],
  outfile: process.env.OUTFILE,
  bundle: true,
  plugins: [
    plugins.resolvePlugin({
      context: {
        buildOptions: {
          rootDir: __dirname,
        },
        buildConfig: {
          resolver: {
            aliases: [{ from: 'react', to: 'react-v17' }],
          },
        },
      },
    }),
  ],
});
