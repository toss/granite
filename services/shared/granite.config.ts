import { defineConfig } from '@granite-js/react-native/config';
import { rollipop } from '@granite-js/rollipop';

export default defineConfig({ appName: 'shared', scheme: 'granite', bundler: rollipop() });
