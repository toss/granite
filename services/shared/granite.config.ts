import { hermes } from '@granite-js/plugin-hermes';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'shared',
  scheme: 'granite',
  entryFile: 'index.ts',
  plugins: [hermes()],
  /**
   * @TODO Remove after migrating preset to plugin
   */
  INTERNAL__useSharedPreset: true,
});
