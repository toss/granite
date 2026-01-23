import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './_app';
import { GestureHandlerRootView } from '@granite-js/native/react-native-gesture-handler';

const appName = 'showcase';
const rootTag = globalThis.document?.getElementById('root');

if (!rootTag) {
  throw new Error('Root element not found');
}

const location = globalThis.location;
const scheme = location?.protocol?.replace(':', '') ?? 'http';
const host = location?.host ?? '';
const schemeUri = `${scheme}://${host}/${appName}`;

globalThis.__granite = globalThis.__granite || {};
globalThis.__granite.app = { name: appName, scheme, host };
globalThis.__granite.meta = globalThis.__granite.meta || {};
globalThis.__granite.meta.env = Object.assign({}, globalThis.__granite.meta.env, import.meta.env);

const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;

createRoot(rootTag).render(
  <StrictMode>
    <GestureHandlerRootView>
      <App
        platform="ios"
        initialColorPreference={prefersDark ? 'dark' : 'light'}
        scheme={schemeUri}
      />
    </GestureHandlerRootView>
  </StrictMode>
);
