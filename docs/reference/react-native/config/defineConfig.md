---
sourcePath: packages/config/src/defineConfig.ts
---

# defineConfig

Defines the app metadata and bundler used by a Granite application.

## Configuration

```ts
// granite.config.ts
import { defineConfig } from '@granite-js/react-native/config';
import { rollipop } from '@granite-js/rollipop';

export default defineConfig({
  appName: 'my-app',
  scheme: 'granite',
  host: 'example',
  bundler: rollipop(),
});
```

## App settings

- `appName`: The app name used in URLs. Required.
- `scheme`: The URL scheme used to launch the app. Required.
- `host`: An optional URL scheme host. When set, the URL takes the form `{scheme}://{host}/{appName}`.
- `cwd`: The project directory used for configuration and builds. Defaults to the package root.

## Bundler

The required `bundler` option accepts an adapter returned by `rollipop()`, `mpack()`, or a custom `BundlerAdapter` implementation.

### Rollipop

Use `rollipop()` for new projects. It runs Rollipop for development and production builds.

See the [Rollipop configuration documentation](https://rollipop.dev/docs/get-started/configuration) for `rollipop.config.ts` options. To load another configuration file, pass `rollipop({ configFile: './custom.rollipop.ts' })`.

### Mpack (deprecated)

Existing projects can continue to use `mpack()`. It runs Metro for development and Mpack for production builds.

```ts
import { defineConfig } from '@granite-js/react-native/config';
import { mpack } from '@granite-js/mpack';

export default defineConfig({
  appName: 'my-app',
  scheme: 'granite',
  bundler: mpack(),
});
```

`mpack()` loads `mpack.config.ts` from the project directory. To load another file, pass `mpack({ config: './custom.mpack.ts' })`.

## Custom adapters

Implement `BundlerAdapter` from `@granite-js/config` to integrate another bundler. `runBuild()` builds one platform configuration, while `runServer()` starts a development server and returns a handle with `close()`. Adapter methods can read the resolved app configuration through `this.getContext()`.

`resetCache()` clears existing caches before a build or server startup. The CLI calls it once when `granite build --reset-cache` or `granite dev --reset-cache` is used. Caching remains enabled after the reset.
