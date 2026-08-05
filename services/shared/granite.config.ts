import { microFrontend } from '@granite-js/micro-frontend/plugin';
import { hermes } from '@granite-js/plugin-hermes';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'shared',
  scheme: 'granite',
  plugins: [
    hermes(),
    microFrontend({
      shared: {
        react: { eager: true },
        'react-native': { eager: true },
      },
    }),
  ],
});
