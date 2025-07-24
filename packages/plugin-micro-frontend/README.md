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
