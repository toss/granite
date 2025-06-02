# @granite-js/plugin-sentry

Plugin for integrating [Sentry](https://sentry.io) with Granite applications

## Installation

```bash
# NPM
npm install @granite-js/plugin-sentry

# pnpm
pnpm add @granite-js/plugin-sentry

# yarn
yarn add @granite-js/plugin-sentry
```

## Usage

```ts
import { defineConfig } from '@granite-js/react-native/config';
import { sentry } from '@granite-js/plugin-sentry';

export default defineConfig({
  plugins: [
    sentry({
      /**
       * Sentry CLI Options
       */
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: '<SENTRY_ORG>',
      project: '<SENTRY_PROJECT>',
    }),
  ],
});
```

> [!IMPORTANT]  
> If you're using [@granite-js/plugin-hermes](https://github.com/toss/granite/tree/main/packages/plugin-hermes), the Sentry plugin should be configured after the Hermes plugin.

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
