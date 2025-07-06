# @granite-js/plugin-hermes

Hermes compilation plugin for Granite

## Installation

```bash
# NPM
npm install @granite-js/plugin-hermes

# pnpm
pnpm install @granite-js/plugin-hermes

# yarn
yarn add @granite-js/plugin-hermes
```

## Usage

```ts
import { defineConfig } from '@granite-js/react-native/config';
import { hermes } from '@granite-js/plugin-hermes';

export default defineConfig({
  plugins: [
    hermes({
      /**
       * Optimization level.
       *
       * - `O0`: No optimization
       * - `Og`: Optimizations suitable for debugging
       * - `O`: Expensive optimizations
       *
       * Defaults to `O`.
       */
      optimization: 'O',
      /**
       * Disable warning message.
       *
       * Defaults to `true`.
       */
      disableWarning: true,
      /**
       * Emit source map.
       *
       * Defaults to `true`.
       */
      sourcemap: true,
    }),
  ],
});
```

```ts
// In other plugin handlers
function handler() {
  const hermesPluginResults = this.meta.hermes ?? [];

  for (const hermesPluginResult of hermesPluginResults) {
    console.log(`Hermes bytecode path: ${hermesPluginResult.hbc}`);
    console.log(`Hermes sourcemap path: ${hermesPluginResult.hbcSourcemap ?? 'N/A'}`);
  }
}
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
