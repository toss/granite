import pkg from '@granite-js/native/package.json';
import { hermes } from '@granite-js/plugin-hermes';
import { shared } from '@granite-js/plugin-shared-modules';
import { defineConfig } from '@granite-js/react-native/config';

const SHARED_MODULE_CONFIG = { singleton: true, eager: true } as const;

function getNativePackages(excludePackages: string[] = []) {
  return Object.keys(pkg.dependencies)
    .filter((libName) => !(libName.startsWith('@types/') || excludePackages.includes(libName)))
    .reduce(
      (prev, libName) => ({
        ...prev,
        [libName]: SHARED_MODULE_CONFIG,
      }),
      {} as Record<string, { singleton: boolean; eager: boolean }>
    );
}

export default defineConfig({
  appName: 'shared',
  scheme: 'granite',
  entryFile: 'index.ts',
  plugins: [
    hermes(),
    shared({
      name: 'shared',
      remote: {
        host: 'localhost',
        port: 8082,
      },
      shared: {
        // @FIXME: AsyncStorage is not included in the sandbox app. need to rebuild the app to include it.
        ...getNativePackages(['@react-native-async-storage/async-storage']),
        react: SHARED_MODULE_CONFIG,
        'react-native': SHARED_MODULE_CONFIG,
      },
    }),
  ],
});
