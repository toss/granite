# @granite-js/plugin-micro-frontend

Legacy Mpack plugin for sharing modules.

## Mpack (deprecated)

```bash
yarn add @granite-js/plugin-micro-frontend
```

```ts
import { defineConfig } from '@granite-js/mpack/config';
import { microFrontend } from '@granite-js/plugin-micro-frontend';

export default defineConfig({
  plugins: [
    microFrontend({
      name: 'host',
      remote: {
        host: 'localhost',
        port: 8082,
      },
      shared: {
        react: { eager: true },
        'react-native': { eager: true },
      },
    }),
  ],
});

export default defineConfig({
  plugins: [
    microFrontend({
      name: 'remote',
      shared: ['react', 'react-native'],
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
