export default function () {
  const baseConfig = {
    presets: [[require.resolve('@react-native/babel-preset')]],
    plugins: [require.resolve('@babel/plugin-transform-export-namespace-from')],
  };

  return baseConfig;
}
