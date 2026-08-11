# @granite-js/micro-frontend

Runs independently built Granite applications in one React Native JavaScript runtime.

The package contains three layers:

- `@granite-js/micro-frontend/plugin`: builds a self-registering app bundle.
- `@granite-js/micro-frontend`: loads, evaluates, and imports app modules.
- `GraniteMicroFrontendRuntime`: evaluates local bundles and bridges native session lifecycle events.

## Plugin

The app name comes from `granite.config.ts`. Hosts do not maintain a remote-app list.

```ts
// Remote app
import { defineConfig } from '@granite-js/react-native/config';
import { microFrontend } from '@granite-js/micro-frontend/plugin';

export default defineConfig({
  appName: 'cart',
  plugins: [
    microFrontend({
      exposes: {
        './App': './src/_app.tsx',
      },
      shared: ['react', 'react-native'],
    }),
  ],
});
```

```ts
// Host app
import { defineConfig } from '@granite-js/react-native/config';
import { microFrontend } from '@granite-js/micro-frontend/plugin';

export default defineConfig({
  appName: 'shared',
  plugins: [
    microFrontend({
      shared: {
        react: { eager: true },
        'react-native': { eager: true },
      },
    }),
  ],
});
```

When evaluated, the remote bundle registers its `appName` container and exposed modules in the shared runtime
registry.

## Runtime

The adapter owns bundle selection, download, verification, and caching. Its result contains the absolute path to a
locally evaluable bundle.

```ts
import { createMicroFrontendRuntime } from '@granite-js/micro-frontend';
import type { ComponentType } from 'react';

const runtime = createMicroFrontendRuntime({
  adapter: {
    async loadBundle({ appName }) {
      const filePath = await bundleStore.loadBundle(appName);
      return { filePath };
    },
  },
});

await runtime.preloadApp('cart');

const App = await runtime.importApp<{
  readonly default: ComponentType<{ readonly scheme: string }>;
}>('cart/App');
```

`importApp('cart/App')` performs the following composition:

```text
adapter.loadBundle({ appName: 'cart' })
  → GraniteMicroFrontendRuntime.evaluateScript({ filePath })
  → verify that the cart container was registered
  → return the cart container's ./App module
```

Concurrent preload/import calls for the same app share one evaluation. A successful evaluation remains cached until
the app's last native session closes. A failed evaluation and its partial container are removed so a later call can
retry.

## Host pending component

Remote apps register a route-level pending component with the package's `createRoute` wrapper. It delegates to
Granite's `createRoute` and additionally associates `hostPendingComponent` with the current `granite.config.ts` app
name, scheme, and host.

```tsx
import { createRoute, hidePendingHostComponent } from '@granite-js/micro-frontend';
import { useEffect } from 'react';

export const Route = createRoute('/products/:productId', {
  component: ProductPage,
  validateParams: parseProductParams,
  hostPendingComponent: ({ thumbnailUrl }) => <ProductPendingComponent thumbnailUrl={thumbnailUrl} />,
});

function ProductPage() {
  useEffect(() => {
    hidePendingHostComponent();
  }, []);

  return <Product />;
}
```

The runtime host resolves the pending component from the incoming URL. It resets the shared visibility state before
opening a new session and keeps the app content hidden until the remote app calls `hidePendingHostComponent()`.

```tsx
import {
  PendingHostComponent,
  useIsPendingHostComponentHidden,
  useResolvedPendingHostComponent,
} from '@granite-js/micro-frontend';

const resolved = useResolvedPendingHostComponent(session.scheme);
const hidden = useIsPendingHostComponentHidden();
const showPendingComponent = resolved != null && !hidden;

<>
  <View style={{ flex: 1, opacity: showPendingComponent ? 0 : 1 }}>
    <RemoteApp scheme={session.scheme} />
  </View>
  {showPendingComponent ? <PendingHostComponent url={session.scheme} /> : null}
</>;
```

The registry and visibility state live on the JavaScript global object, so separately bundled host and remote package
instances communicate without an app-specific bridge.

## TurboModule

The React Native Codegen module is named `GraniteMicroFrontendRuntime`.

```ts
interface Spec extends TurboModule {
  evaluateScript(request: { readonly filePath: string }): Promise<void>;
  requestCloseSession(request: { readonly sessionId: string }): Promise<void>;
  startEventDelivery(): void;
  readonly onEvent: CodegenTypes.EventEmitter<NativeMicroFrontendRuntimeEvent>;
}
```

TurboModule methods use request objects so native integrations can add optional fields without changing positional
arguments. The public JavaScript facade still accepts `evaluateScript(filePath)` and `closeSession(sessionId)`.

`startEventDelivery()` is internal to the JavaScript facade. It flushes lifecycle events that arrived before the first
`onEvent()` subscription.

## Brownfield integration

The package supplies the `GraniteMicroFrontendRuntime` TurboModule and native
session registry. The brownfield app does not implement another TurboModule.
It must:

1. create a unique `sessionId` for each native screen;
2. resolve the screen's `appName` and incoming `scheme`;
3. bind the screen lifecycle with the APIs below;
4. install a Portal host using that same `sessionId`; and
5. provide the JavaScript `adapter.loadBundle()` implementation shown above.

The shared identifier joins the two packages:

```text
native session binding(sessionId)
  → openApp event(sessionId, appName, scheme)
  → <Portal hostName={sessionId}>
  → native Portal host(sessionId)
```

Native owns how the screen closes. `closeSession()` invokes the registered
close action instead of searching for an `Activity` or `UIViewController` from
JavaScript. The React tree remains mounted until native teardown emits
`closeApp`.

The brownfield screen lifecycle is the source of truth for presentation
visibility. This package transports that state through
`sessionVisibilityChanged` and `MicroFrontendSessionRenderer`; Portal separately
owns whether content is attached to a destination host. Do not derive screen
visibility from Portal attachment because a host can stay attached while its
native screen is not visible.

### Android

```kotlin
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import java.util.UUID
import run.granite.microfrontend.ActivitySessionBinding

class CartActivity : AppCompatActivity() {
  private val sessionId = UUID.randomUUID().toString()
  private lateinit var sessionBinding: ActivitySessionBinding

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val scheme = requireNotNull(intent.data).toString()

    sessionBinding = ActivitySessionBinding.bind(
      activity = this,
      sessionId = sessionId,
      appName = "cart",
      scheme = scheme,
    )

    // Install the @granite-js/portal host with hostName = sessionId.
    installPortalHost(sessionId)
  }
}
```

`ActivitySessionBinding` emits `openApp` when bound, maps `onActivityStarted`
and `onActivityStopped` to visibility, and emits `closeApp` when the activity is
destroyed. A JavaScript `closeSession(sessionId)` request calls
`Activity.finish()` on the main thread. Retain the binding for the lifetime of
the activity; custom screen containers can instead retain
`GraniteMicroFrontendRuntimeHost.registerSession()` and drive `openApp`,
`setVisible`, `closeApp`, and `close()` themselves.

### iOS

```objc
#import <GraniteMicroFrontendRuntime/GraniteMicroFrontendRuntimeHost.h>

__weak typeof(self) weakSelf = self;
self.sessionBinding =
    [GraniteMicroFrontendViewControllerSessionBinding bindViewController:self
                                                               sessionId:self.sessionId
                                                                 appName:@"cart"
                                                                  scheme:@"granite://cart/products/1"
                                                            closeHandler:^{
  [weakSelf dismissViewControllerAnimated:YES completion:^{
    [weakSelf.sessionBinding invalidate];
    weakSelf.sessionBinding = nil;
  }];
}];

// Install the @granite-js/portal host with name = self.sessionId.
[self installPortalHostWithName:self.sessionId];
```

Retain `sessionBinding` until the controller is dismissed. The binding emits
`openApp` once, derives visibility from appearance callbacks, and emits
`closeApp` only when it is invalidated or deallocated after teardown. Create
and invalidate it on the main thread, and weakly capture the controller in the
close handler so the binding can be released with its `UIViewController`.

Custom containers can instead retain a
`GraniteMicroFrontendSessionRegistration` from
`GraniteMicroFrontendRuntimeHost.registerSession`, then call `openApp`,
`setVisible`, `closeApp`, and `invalidate` from their own lifecycle.

### Optional native preload

Call `requestPreloadApp` when a native entry point must know whether JavaScript
finished loading and evaluating an app before navigation. Its callback is
completed by the JavaScript runtime after `adapter.loadBundle()` and
`evaluateScript()` finish. Retain the returned registration while the request
is relevant and close/invalidate it to cancel the callback.

Use `emitPreloadApp` only for fire-and-forget warm-up when native does not need
completion or failure reporting.

## Session rendering

```tsx
import { Portal, PortalProvider } from '@granite-js/portal';
import {
  createMicroFrontendRuntime,
  MicroFrontendSessionRenderer,
  type MicroFrontendRuntimeEvent,
} from '@granite-js/micro-frontend';
import { lazy, useEffect, useReducer, type ComponentType, type LazyExoticComponent } from 'react';

interface AppProps {
  readonly scheme: string;
}

interface AppModule {
  readonly default: ComponentType<AppProps>;
}

interface Session {
  readonly sessionId: string;
  readonly scheme: string;
  readonly isVisible: boolean;
  readonly App: LazyExoticComponent<ComponentType<AppProps>>;
}

type Action =
  | { readonly type: 'opened'; readonly session: Session }
  | { readonly type: 'closed'; readonly sessionId: string }
  | {
      readonly type: 'visibilityChanged';
      readonly sessionId: string;
      readonly isVisible: boolean;
    };

function reduceSessions(sessions: readonly Session[], action: Action): readonly Session[] {
  switch (action.type) {
    case 'opened':
      return sessions.some(({ sessionId }) => sessionId === action.session.sessionId)
        ? sessions
        : [...sessions, action.session];
    case 'closed':
      return sessions.filter(({ sessionId }) => sessionId !== action.sessionId);
    case 'visibilityChanged':
      return sessions.map((session) =>
        session.sessionId === action.sessionId ? { ...session, isVisible: action.isVisible } : session
      );
    default:
      action satisfies never;
      return sessions;
  }
}

declare const runtime: ReturnType<typeof createMicroFrontendRuntime>;
declare function reportError(error: unknown): void;

export function MonoHermesTrack() {
  const [sessions, dispatch] = useReducer(reduceSessions, []);

  useEffect(() => {
    const subscription = runtime.onEvent((event: MicroFrontendRuntimeEvent) => {
      switch (event.name) {
        case 'preloadApp':
          void runtime.preloadApp(event.params.appName).catch(reportError);
          return;
        case 'openApp': {
          const { appName, scheme, sessionId } = event.params;
          dispatch({
            type: 'opened',
            session: {
              sessionId,
              scheme,
              isVisible: false,
              App: lazy(() => runtime.importApp<AppModule>(`${appName}/App`)),
            },
          });
          return;
        }
        case 'closeApp':
          dispatch({ type: 'closed', sessionId: event.params.sessionId });
          return;
        case 'sessionVisibilityChanged':
          dispatch({
            type: 'visibilityChanged',
            sessionId: event.params.sessionId,
            isVisible: event.params.isVisible,
          });
          return;
        default:
          event satisfies never;
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <PortalProvider>
      {sessions.map(({ App, ...session }) => (
        <Portal key={session.sessionId} hostName={session.sessionId}>
          <MicroFrontendSessionRenderer
            app={App}
            sessionId={session.sessionId}
            scheme={session.scheme}
            isVisible={session.isVisible}
            close={() => runtime.closeSession(session.sessionId)}
          />
        </Portal>
      ))}
    </PortalProvider>
  );
}
```

Remote apps use Granite's `useVisibility()` for visibility and `useMicroFrontendSession()` to request a close without
receiving `sessionId` as an application prop. The renderer keeps session visibility inside Granite's existing
visibility provider chain, so remote applications do not need session-specific visibility code.
