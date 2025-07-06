import { env } from '@granite-js/plugin-env';
import { hermes } from '@granite-js/plugin-hermes';
import { radon } from '@granite-js/plugin-radon';
import { router } from '@granite-js/plugin-router';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  /**
   * granite://showcase
   */
  scheme: 'granite',
  appName: 'showcase',
  plugins: [
    router(),
    env({ MY_ENV: 'test' }),
    radon(),
    hermes(),
    {
      name: 'test',
      build: {
        order: 'post',
        handler: function () {
          console.debug('[DEBUG] Plugin meta:', this.meta);
        },
      },
    },
  ],
});
