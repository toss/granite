import path from 'path';

export function getDefaultReactNativePath(rootDir: string) {
  return path.dirname(
    require.resolve('react-native/package.json', {
      paths: [rootDir],
    })
  );
}
