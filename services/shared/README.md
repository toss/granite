# Shared host with an opt-in service-session track

This app keeps its existing single-remote path and adds the shared-runtime session host as an explicit opt-in. The
native host selects the track through the shared bundle's initial props:

```ts
// Existing behavior: remoteApp/AppContainer is loaded through the legacy bundle loader.
const legacyInitialProps = {};

// Shared-runtime behavior: native session events drive service roots in this runtime.
const serviceSessionInitialProps = {
  _monoHermes: true,
  _serviceSessionBundleLoaderModuleName: 'ServiceBundleLoader',
  _serviceSessionEventModuleName: 'HostEventModule',
};
```

Only the literal boolean `true` enables the service-session track. Missing, `false`, or string values keep the legacy
path. `_serviceSessionEventModuleName` names the Brick event module through which the platform sends session events;
`_serviceSessionBundleLoaderModuleName` names the Brick module whose `importService(bundleRequest)` method evaluates a
real service bundle. The example does not depend on a product-specific native-module package. The selection is implemented in
[`src/pages/MainPage.tsx`](./src/pages/MainPage.tsx), with the two tracks in [`src/pages/MainPage`](./src/pages/MainPage).

## Legacy track

`LegacyMainPageTrack` preserves the existing `remoteApp/AppContainer` contract and the platform's existing lazy bundle
loader. This path never reads the service-session native module.

## Service-session track

`MonoHermesMainPageTrack` is an end-to-end example of hosting multiple service bundles in one Granite JavaScript
runtime. It keeps platform integration outside `@granite-js/plugin-micro-frontend` and connects the pieces in this
order:

```text
platform session coordinator
  -> __GRANITE_SERVICE_SESSION_NATIVE__ or Brick modules
  -> ServiceSessionRouter
  -> createServiceBundleLoader
  -> service bundle's "Service" expose
  -> service component's session prop
```

### Platform contract

When `_monoHermes` is `true`, the host resolves the platform boundary in either of two ways:

1. If the platform installed `__GRANITE_SERVICE_SESSION_NATIVE__` before the shared bundle starts, it uses that object.
2. Otherwise, it receives events through the Brick module named by `_serviceSessionEventModuleName` and evaluates the
   requested service through `importService` on `_serviceSessionBundleLoaderModuleName`.

The direct platform contract is:

```ts
globalThis.__GRANITE_SERVICE_SESSION_NATIVE__ = {
  evaluateServiceBundle: (bundleRequest) => platformBundleLoader.evaluate(bundleRequest),
  onSessionEvent: (listener) => platformSessionCoordinator.subscribe(listener),
};
```

`onSessionEvent` sends the following messages. `bundleRequest` is a stable bundle identity used as the loader cache
key, while `url` is the session-specific route passed to the service.

```ts
{ eventName: 'openService', body: { identifier, bundleRequest, url } }
{ eventName: 'closeService', body: { identifier } }
{ eventName: 'sessionVisibilityChanged', body: { identifier, isVisible } }
```

Malformed messages are ignored at the native boundary. Opening a session evaluates its bundle once per
service key; closing removes only that rendered session. Visibility changes are passed to the service so it can
pause polling or other work while hidden.

The service-session track never calls `__mpackInternal.loadRemote` and does not merge service bundles into the shared
development bundle. The shared host and each service run their own `--experimental-mode` server. The platform bundle
loader resolves and evaluates each service bundle separately through `importService(bundleRequest)`, matching the
production lifecycle.

### Development without a merged bundle

Start one server per bundle:

```bash
yarn workspace @granite-app/shared dev --port 8081
yarn workspace @granite-app/bare dev --port 8082
yarn workspace @granite-app/showcase dev --port 8083
```

In framework development mode, configure the native `importService` implementation with a service-to-port mapping.
For example, `bare -> 8082` and `showcase -> 8083`. The native loader should request that server's
`/index.bundle?platform=ios&dev=true&minify=false`, evaluate the response in the retained shared runtime, and return
the service name. If development mode is off or no port is configured, it must fall through to the existing
production bundle resolver.

The micro-frontend plugin prelude owns shared-module registration in both production builds and the experimental
development server. Keep the host and service `shared` lists aligned. Native libraries such as image, video, or pager
modules must be registered by the host and externalized by every service that can import them.

Each session root uses `nativeID="micro-frontend-session:<identifier>"` with view flattening disabled. A native host
may use that stable ID to associate the React Native view tree with its session container.

### Service bundle

Every service bundle must use a unique container name and expose a module named `Service`. A service that must also
support the legacy track may expose both entry points from the same build:

```ts
import { microFrontend } from '@granite-js/plugin-micro-frontend';
import { hermes } from '@granite-js/plugin-hermes';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'catalog',
  scheme: 'service',
  plugins: [
    hermes(),
    microFrontend({
      name: 'catalog-service',
      exposes: {
        './AppContainer': './src/_app.tsx',
        './Service': './src/Service.tsx',
      },
      shared: ['react', 'react-native'],
    }),
  ],
});
```

The exposed component receives both the original Granite props and the current session:

```tsx
import type { InitialProps } from '@granite-js/react-native';

type ServiceProps = {
  readonly initialProps: InitialProps;
  readonly session: {
    readonly identifier: string;
    readonly bundleRequest: string;
    readonly url: string;
    readonly isVisible: boolean;
  };
};

export default function Service({ initialProps, session }: ServiceProps) {
  return (
    <CatalogPage
      colorPreference={initialProps.initialColorPreference}
      isVisible={session.isVisible}
      url={session.url}
    />
  );
}
```

In a real application, place `ServiceProps` in a small contract package shared by the host and service bundles.

The repository includes [`services/bare`](../bare) as a minimal service structure and [`services/showcase`](../showcase)
as a larger example. Both expose `./Service`; they are not injected into the shared development bundle. To exercise
them in an application, make their bundles available through the platform's `importService` implementation.

The showcase home screen includes a URL-scheme input. Enter a value such as `granite://bare` or your host's
equivalent service URL and press **Open Scheme** to exercise the native session coordinator from an already loaded
service.

The session implementation lives in [`src/session`](./src/session). It deliberately contains no platform-specific
bundle downloader, native module package, monitoring SDK, or URL format.
