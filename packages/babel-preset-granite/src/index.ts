export default function (api: { env: (env: string) => boolean }) {
  const isTest = api?.env('test');

  const baseConfig = {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          targets: isTest
            ? {
                node: 'current',
              }
            : {
                ie: 11,
              },
        },
      ],
      [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
      require.resolve('@babel/preset-typescript'),
    ],
    plugins: [
      [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }],
      require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
      require.resolve('@babel/plugin-proposal-numeric-separator'),
      require.resolve('@babel/plugin-proposal-optional-chaining'),
      [require.resolve('@babel/plugin-proposal-private-methods'), { loose: true }],
      [require.resolve('@babel/plugin-proposal-private-property-in-object'), { loose: true }],
      require.resolve('@babel/plugin-transform-flow-strip-types'),
    ],
  };

  return baseConfig;
}
