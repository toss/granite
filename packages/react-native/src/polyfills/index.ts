import { setupURLPolyfill } from 'react-native-url-polyfill';

export function setupPolyfills() {
  setupAsyncIterator();
  const runtime = globalThis as {
    document?: unknown;
    URL?: unknown;
    URLSearchParams?: unknown;
  };

  if (runtime.document) {
    return;
  }

  if (runtime.URL && runtime.URLSearchParams) {
    return;
  }

  setupURLPolyfill();
}

function setupAsyncIterator() {
  if (typeof Symbol !== 'undefined' && !Symbol.asyncIterator) {
    (Symbol as any).asyncIterator = Symbol.for('@@asyncIterator');
  }
}
