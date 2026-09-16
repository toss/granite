import { defineConfig } from '@granite-js/react-native/config';
import { rollipop } from '@granite-js/rollipop';

export default defineConfig({
  appName: 'showcase',
  scheme: 'granite',
  bundler: rollipop(),
});
