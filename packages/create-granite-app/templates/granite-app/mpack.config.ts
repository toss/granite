import { defineConfig } from '@granite-js/mpack/config';
import { router } from '@granite-js/plugin-router';
import { hermes } from '@granite-js/plugin-hermes';

export default defineConfig({ plugins: [router(), hermes()] });
