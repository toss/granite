import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
  require.resolve('rollipop');
} catch (error) {
  throw new Error('`@granite-js/rollipop` requires `rollipop` to be installed.', { cause: error });
}

export { rollipop, type RollipopOptions } from './rollipop';
