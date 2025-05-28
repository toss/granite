module.exports = {
  appName: 'test',
  scheme: 'test-scheme',
  tasks: [
    {
      tag: 'foo',
      build: {
        platform: 'ios',
        entry: './index.js',
        outfile: './out.js',
        esbuild: {
          jsx: 'automatic',
        },
      },
    },
  ],
};
