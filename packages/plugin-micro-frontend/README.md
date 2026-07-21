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

### Loading multiple service bundles in one runtime

The runtime entrypoint provides a loader for hosts that evaluate multiple service bundles in the same JavaScript
runtime. Bundle fetching and evaluation stay platform-owned and are supplied through `evaluate`.

Each service bundle must register a unique micro-frontend container name. The loader resolves the requested expose
only from containers appended by that service's evaluation, serializes concurrent evaluations, caches successful
loads by the caller-defined service key, and removes failed loads from the cache so they can be retried.

```ts
import { createServiceBundleLoader, createServiceGlobalGuard } from '@granite-js/plugin-micro-frontend/runtime';

type AppContainer = (props: unknown) => unknown;

declare const serviceBundleEvaluator: {
  evaluate(request: string): Promise<void>;
};
declare const monitoring: {
  capture(report: unknown): void;
};

function isAppContainerModule(value: unknown): value is { readonly default: AppContainer } {
  return typeof value === 'object' && value !== null && 'default' in value && typeof value.default === 'function';
}

const globalGuard = createServiceGlobalGuard({
  protectedKeys: ['__APP_RUNTIME__'],
  onReport: (report) => monitoring.capture(report),
});

const serviceLoader = createServiceBundleLoader<AppContainer>({
  evaluate: (request) => serviceBundleEvaluator.evaluate(request),
  exposeName: 'AppContainer',
  getServiceKey: (request) => /^service:\/\/([^/?#]+)/.exec(request)?.[1]?.toLowerCase() ?? null,
  globalGuard,
  parseExposedModule: (module) => (isAppContainerModule(module) ? module.default : null),
});

const service = await serviceLoader.load('service://catalog');
```

`isMonoHermes()` returns `true` while a service bundle is being evaluated and after the loader resolves a valid
exposed module. It remains `false` for legacy execution and when loading falls back without resolving a service
bundle. Runtime-aware libraries can use this helper without requiring service applications to pass a separate flag.

```ts
import { isMonoHermes } from '@granite-js/plugin-micro-frontend/runtime';

const shouldUseIndependentNavigation = isMonoHermes();
```

Use the optional `fallback` callback only when the host has an explicit legacy resolution path. Parser errors are
never routed through fallback because they indicate an invalid exposed-module contract.

The micro-frontend plugin prelude owns the shared registry in both production builds and the experimental development
server. The host and every service must use the same `shared` module names. A module included by both bundles can
execute native registration twice; a module externalized by a service but missing from the host registry fails at
runtime.

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
