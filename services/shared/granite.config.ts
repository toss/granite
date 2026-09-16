import { mpack } from '@granite-js/mpack';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({ appName: 'shared', scheme: 'granite', bundler: mpack() });
