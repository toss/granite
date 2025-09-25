import { setup as setupSymbolAsyncIterator } from './symbol-asynciterator';
import { setup as setupURLPolyfill } from './url';

export function setupPolyfills() {
  setupSymbolAsyncIterator();
  setupURLPolyfill();
}
