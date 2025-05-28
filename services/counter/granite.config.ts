import { env } from '@granite-js/plugin-env';
import { hermes } from '@granite-js/plugin-hermes';
import { router } from '@granite-js/plugin-router';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  /**
   * granite://counter
   */
  scheme: 'granite',
  appName: 'counter',
  plugins: [
    router(),
    env({ MY_ENV: 'test' }),
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
