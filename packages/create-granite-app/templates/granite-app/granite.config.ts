import { defineConfig } from '@granite-js/react-native/config';
import { mpack } from '@granite-js/mpack';

export default defineConfig({ appName: '%%appName%%', scheme: 'granite', bundler: mpack() });
