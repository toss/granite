import { defineConfig } from '@granite-js/mpack/config';
import { hermes } from '@granite-js/plugin-hermes/mpack';
import { router } from '@granite-js/plugin-router/mpack';

export default defineConfig({ plugins: [router(), hermes()] });
