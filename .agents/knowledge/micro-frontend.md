# Micro Frontend Knowledge

## Package Role

`packages/plugin-micro-frontend` provides the Granite micro-frontend build/runtime layer.

Surface classification:

- `microFrontend(...)` from `@granite-js/plugin-micro-frontend` is a user surface API.
- `MicroFrontendPluginOptions` is a user surface type.
- `@granite-js/plugin-micro-frontend/runtime` is exported and reachable, but is mostly used by generated prelude code and host/example app internals.
- Runtime helpers such as container creation, shared module registration, and module exposure are internal to the micro-frontend runtime flow unless a specific public use case is documented.

## Stable Responsibilities

The plugin has four stable responsibilities:

- It injects a micro-frontend prelude into the bundle.
- It creates a named container for each bundle.
- It registers eager shared modules, such as React or React Native, into `global.__MICRO_FRONTEND__.__SHARED__`.
- It rewrites non-eager shared imports to load from that shared registry and exposes configured remote modules through the container `exposeMap`.

## Shared Modules

The `shared` option has two modes:

- `eager: true`: bundle the module into the current bundle and register it into the shared registry.
- Non-eager shared module: treat the module as an external dependency resolved from `global.__MICRO_FRONTEND__.__SHARED__`.

When React or React Native are shared, the plugin also expands known React and React Native subpaths so those imports follow the same sharing model.

## Shared App And Remote App Classification

`granite.config.ts` means a workspace package can be built as a Granite bundle; it does not decide by itself whether the bundle is a host app or a remote app. The runtime role is decided by the entry file:

- `Granite.registerHostApp(...)` makes a bundle the host app. The host app must use the reserved `appName: 'shared'`.
- `Granite.registerApp(...)` makes a bundle a remote/service app. Regular service apps cannot use `appName: 'shared'`.

`services/shared` is an example directory, but the `shared` host bundle concept is a real runtime contract. The shared app owns the common runtime shell: it starts first in the React Native runtime, registers eager shared modules, and renders remote app content after a remote bundle has been loaded.

Remote apps such as `services/showcase` and `services/counter` expose their `AppContainer` through `exposes` and list dependencies such as React and React Native in `shared` so those imports resolve from the host shared registry instead of being bundled again.

Do not describe a remote app's `shared` option as redundant with native dependencies. Native dependencies make modules available to the native app; the remote JavaScript bundle still needs a bundler/runtime contract that says which imports come from the host shared registry. Without it, remote bundles can duplicate React, React Native, navigation, or other shared libraries and risk hook, context, native module, or version mismatch problems.

## Host And Remote Flow

`exposes` maps public module names to local files so a host can load a remote module such as `remoteApp/AppContainer`.

The example pattern is:

- `services/shared` behaves as a host example and eagerly registers common shared modules.
- `services/showcase` and `services/counter` behave as remote examples and expose `./AppContainer` under a `remoteApp` container.

`services/shared/src/pages/MainPage.tsx` currently hardcodes `remoteApp/AppContainer`. A production integration can choose a remote app from native-provided initial props, scheme data, or app-level routing, but the concrete `TossBundleLoader` contract for selecting and downloading a specific remote bundle is not implemented in this repository.

Development server support can prefetch a remote bundle and merge it with a host bundle through mpack internals. Production remote-bundle download and evaluation is outside `packages/plugin-micro-frontend`; in the example host it is represented by `TossBundleLoader.importLazy()`.
