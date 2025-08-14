import path from 'path';
import { getPackageRoot } from '@granite-js/utils';

export function resolveReactNativeBasePath() {
  return path.dirname(require.resolve('react-native/package.json', { paths: [getPackageRoot()] }));
}
