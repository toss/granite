---
sourcePath: packages/config/src/defineConfig.ts
---

# defineConfig

Configures your Granite application by defining key settings in `granite.config.ts`.

The configuration lets you specify:

- How users will access your app through a URL scheme (e.g. `granite://`)
- Your app's unique name that appears in the URL (e.g. `granite://my-service`)
- The bundler adapter used for builds and the development server

## Basic Configuration

```ts
// granite.config.ts
import { defineConfig } from '@granite-js/react-native/config';
import { mpack } from '@granite-js/mpack';

export default defineConfig({
  appName: 'my-app',
  scheme: 'granite',
  host: 'example',
  bundler: mpack(),
});
```

With this configuration, the app is accessible at `granite://example/my-app`.

## App Settings

- `appName`: Your app's unique name that appears in URLs. Required.
- `scheme`: The URL scheme for launching your app. Required.
- `host`: The optional URL scheme host.
  When specified, the URL takes the form `{scheme}://{host}/{appName}`.
  This is separate from the development server's listen address.
- `cwd`: The project directory used for configuration and builds. Defaults to the package root.

## Bundler Settings

The required `bundler` option selects an adapter for builds and the development server. Use an adapter returned by `mpack()` or `rollipop()`, rather than a bundler name string.

Configure entry points, output paths, plugins, and other build options through the adapter or its configuration file.

### Mpack

Mpack is deprecated and retained for backward compatibility. Use `mpack()` from `@granite-js/mpack`. It runs Metro for development and Mpack for production builds.

`mpack()` or `mpack({})` loads a configuration file such as `mpack.config.ts` from the project directory.
Use `mpack({ config: './custom.mpack.ts' })` to select another file.

```ts
// mpack.config.ts
import { defineConfig } from '@granite-js/mpack/config';
import { hermes } from '@granite-js/plugin-hermes';

export default defineConfig({
  entryFile: './index.ts',
  plugins: [hermes()],
});
```

Add Granite plugins to `plugins` and low-level Mpack build plugins to `buildPlugins`.
Use `build`, `metro`, and `devServer` to customize builds and the development server.

Configuration files can also export async factories. They receive `appName`, `host`, `scheme`, `cwd`, `command` (`build` or `serve`), and `mode`.

Alternatively, pass the same `MpackConfig` options directly to `mpack()`. Inline configuration does not load or merge a configuration file for either builds or the development server.

```ts
// granite.config.ts
import { defineConfig } from '@granite-js/react-native/config';
import { mpack, type MpackInlineOptions } from '@granite-js/mpack';

const bundlerConfig = {
  entryFile: './index.ts',
  build: { esbuild: { minify: false } },
} satisfies MpackInlineOptions;

export default defineConfig({
  appName: 'my-app',
  scheme: 'granite',
  bundler: mpack(bundlerConfig),
});
```

`MpackConfigFileOptions` and `MpackInlineOptions` are exported from `@granite-js/mpack`. `MpackOptions` is their union, and file selection cannot be combined with inline options. For example, `mpack({ config: './custom.mpack.ts', build: {} })` is rejected by both TypeScript and at runtime. To use inline defaults without loading a file, pass an option such as `mpack({ build: {} })` instead of `mpack({})`.

### Rollipop

Import `rollipop` from `@granite-js/rollipop` and set `bundler: rollipop()`. It uses Rollipop for both the development server and production builds.

Define build settings and plugins in a Rollipop configuration file such as `rollipop.config.ts`. Use `rollipop({ configFile: './custom.rollipop.ts' })` to select another file.

```ts
// rollipop.config.ts
import { defineConfig } from 'rollipop';

export default defineConfig({
  entry: './index.ts',
  plugins: [],
});
```

## Custom Adapters

To implement a bundler integration, use the `BundlerAdapter` interface from `@granite-js/config`. Its `runBuild()` method builds one platform configuration and returns one result. Its `runServer()` method starts a development server and returns a handle with a `close()` method. Callers create platform-specific option arrays and control concurrent builds.

Inside adapter methods, `this.getContext()` provides read-only `appName`, `scheme`, `host`, and `cwd` values. Use method syntax rather than arrow functions to access `this` and incorporate those values into bundler configuration.
