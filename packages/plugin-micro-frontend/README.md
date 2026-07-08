# @granite-js/plugin-micro-frontend

Plugin for sharing modules

## Installation

```bash
# NPM
npm install @granite-js/plugin-micro-frontend

# pnpm
pnpm add @granite-js/plugin-micro-frontend

# yarn
yarn add @granite-js/plugin-micro-frontend
```

## Usage

```ts
import { defineConfig } from '@granite-js/react-native/config';
import { microFrontend } from '@granite-js/plugin-micro-frontend';

// Example 1. Host container
export default defineConfig({
  plugins: [
    microFrontend({
      /**
       * Container name
       */
      name: 'host',
      /**
       * Configuration for the remote field to emulate the internal `importLazy` behavior
       */
      remote: {
        host: 'localhost',
        port: 8082,
      },
      /**
       * Shared modules config
       */
      shared: {
        react: {
          /**
           * Whether the module is eager
           *
           * Specifies whether the module is eager; if true, it's bundled with the host, otherwise loaded from the shared registry
           */
          eager: true,
        },
        'react-native': {
          eager: true,
        },
      },
    }),
  ],
});

// Example 2. Remote container
export default defineConfig({
  plugins: [
    microFrontend({
      /**
       * Container name
       */
      name: 'remote',
      /**
       * Shared modules config
       */
      shared: [
        // Libraries are loaded from the shared registry
        'react',
        'react-native',
      ],
    }),
  ],
});
```

## Scoped runtime

`@granite-js/plugin-micro-frontend/runtime` also exposes `createScopedRuntime()` for hosts that keep multiple remotes warm in one JavaScript runtime. It gives a remote factory its own global-like object and routes the existing runtime APIs through that scope while the factory runs.

Build output registers the generated remote entry by the Granite `appName`, not by the micro-frontend container `name`. For example, an app configured with `appName: 'showcase'` and `microFrontend({ name: 'remoteApp' })` is re-entered through:

```ts
global.__GRANITE_MICRO_FRONTEND_ENTRIES__.showcase();
```

The container name still remains the module namespace used by remote imports such as `remoteApp/AppContainer`.

```ts
import { createContainer, createScopedRuntime, exposeModule } from '@granite-js/plugin-micro-frontend/runtime';
import { CarScreen } from './CarScreen';

const runtime = createScopedRuntime();

runtime.evaluate((globalThis) => {
  globalThis.remoteName = 'car';

  const container = createContainer('car', {});
  exposeModule(container, './Screen', { default: CarScreen });
});

const { default: Screen } = runtime.importRemoteModule('car/Screen');
```

Use `dispose()` when the warmed remote is no longer needed. It clears timers created through the scoped global and removes configurable scope-owned global properties without deleting host-owned properties. Non-configurable scoped global definitions are rejected because they cannot be cleaned up safely.

```ts
runtime.dispose();
```

This is a same-runtime boundary for trusted remote bundle code. It scopes common top-level writes only when the bundle is emitted as a synchronous factory that receives `global`, `globalThis`, `window`, and `self` from `evaluate()`. Already-executed top-level code cannot be retroactively scoped, async factories are rejected, and this is not a security sandbox for untrusted JavaScript.

## License

This software is licensed under the [Apache 2 license](LICENSE), quoted below.

```
Copyright 2025 Viva Republica, Inc

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

```
