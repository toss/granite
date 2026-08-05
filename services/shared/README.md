# Shared micro-frontend host

The shared app keeps its existing single-app track and enables the mono-Hermes micro-frontend host when native passes
`{ _monoHermes: true }` as an initial prop.

```text
preloadApp/openApp native event
  -> adapter.loadBundle(appName)
  -> GraniteMicroFrontendRuntime.evaluateScript({ filePath })
  -> importApp(`${appName}/App`)
  -> Portal mounted with the native sessionId
```

## Example bundle loader

[`src/micro-frontend/runtime.ts`](./src/micro-frontend/runtime.ts) is a deliberately small adapter for the two example
apps, `bare` and `showcase`. It delegates download, verification, and caching to this object-based TurboModule:

```ts
interface GraniteExampleMicroFrontendBundleLoader extends TurboModule {
  loadBundle(request: {
    readonly appName: 'bare' | 'showcase';
  }): Promise<string>;
}
```

`loadBundle()` returns the absolute path of the locally cached bundle. The native example host can map the app name to
development servers or production bundle storage without putting URLs in the JavaScript runtime contract.

Start the independent development bundles with:

```bash
yarn workspace @granite-app/shared dev --port 8081
yarn workspace @granite-app/bare dev --port 8082
yarn workspace @granite-app/showcase dev --port 8083
```

Both remote apps use `@granite-js/micro-frontend/plugin` and expose `./App`. The plugin derives each container name
from its `appName` in `granite.config.ts`.

## Session lifecycle

[`MonoHermesMainPageTrack`](./src/pages/MonoHermesMainPageTrack.tsx) consumes `preloadApp`, `openApp`, `closeApp`, and
`sessionVisibilityChanged` events. Its reducer owns the React session trees; native owns screen closure and sends
`closeApp` after the transition completes.

Every mounted root uses the native `sessionId` as its Portal host name and
`nativeID="micro-frontend-session:<sessionId>"`. Remote apps read visibility and request close through
`MicroFrontendSessionProvider` instead of receiving the session identifier as an app prop.
