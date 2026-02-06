module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
  ],
  plugins: ['babel-plugin-syntax-hermes-parser', '@babel/plugin-transform-flow-strip-types', '@babel/plugin-transform-private-methods'],
};
