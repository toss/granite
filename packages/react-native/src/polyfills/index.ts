import { setupURLPolyfill } from 'react-native-url-polyfill';

export function setupPolyfills() {
  setupAsyncIterator();
  setupURLPolyfill();
}

function setupAsyncIterator() {
  if (typeof Symbol !== 'undefined' && !Symbol.asyncIterator) {
    (Symbol as any).asyncIterator = Symbol.for('@@asyncIterator');
  }
}
