import { router } from '@granite-js/plugin-router';
import { hermes } from '@granite-js/plugin-hermes';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: '%%appName%%',
  scheme: 'granite',
  plugins: [router(), hermes()],
});
