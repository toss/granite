# Shared micro-frontend host

This service demonstrates how independently built Granite apps can run in one React Native and Hermes runtime.
The host does not keep a remote-app list. Native lifecycle events identify an app with the `appName` from its
`granite.config.ts`.

## Run the development bundles

```sh
yarn workspace @granite-app/shared dev --port 8081
yarn workspace @granite-app/counter dev --port 8082
```

The native application decides how an `appName` maps to a development server or production artifact. The example
adapts a native `GraniteMicroFrontendBundleLoader` TurboModule to `MicroFrontendAdapter`:

```ts
interface GraniteMicroFrontendBundleLoader extends TurboModule {
  loadBundle(appName: string): Promise<string>;
}
```

`loadBundle()` must download or select the app bundle, verify it, cache it, and resolve to an absolute local file
path. This module belongs to the embedding application, not `@granite-js/micro-frontend`; applications can replace
it with any implementation of `MicroFrontendAdapter`.

## Session flow

1. Native sends `preloadApp` or `openApp` with an `appName`.
2. `MonoHermesTrack` calls `preloadApp(appName)` or `importApp(appName + '/App')`.
3. The runtime loads and evaluates the app bundle once, then obtains its `./App` exposure.
4. The app is mounted into a Portal named with the native `sessionId`.
5. `closeApp` unmounts that session; evaluated app code remains available for another session.

The reducer keeps open, close, and visibility changes isolated by `sessionId`. Native owns the matching Portal host
and registers the same `sessionId` with `GraniteMicroFrontendRuntimeHost` so a remote app can request its screen to
close through `useMicroFrontendSession()`.

`services/counter` is the remote example. Its bundle uses the same `appName: 'counter'`, exposes `./App`, and shares
React and React Native with this host.
