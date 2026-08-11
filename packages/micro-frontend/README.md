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

## Native session host

Native creates the `sessionId`, registers how that native screen closes, and sends the same identifier with lifecycle
events. `closeSession()` never searches for a ViewController or Activity from JavaScript.

### Android

```kotlin
class AppActivity : Activity() {
    private val sessionId = UUID.randomUUID().toString()
    private lateinit var binding: ActivitySessionBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySessionBinding.bind(
            this,
            sessionId,
            "cart",
            intent.data.toString(),
        )
    }
}
```

### iOS

```objc
self.binding =
    [GraniteMicroFrontendViewControllerSessionBinding bindViewController:viewController
                                                               sessionId:self.sessionId
                                                                 appName:@"cart"
                                                                  scheme:@"granite://cart/products/1"
                                                            closeHandler:^{
  [viewController dismissViewControllerAnimated:YES completion:^{
    [self.binding invalidate];
  }];
}];
```

The binders emit `openApp` once when bound, deduplicate visibility from the native appearance lifecycle, and emit
`closeApp` only when the native host is invalidated or deallocated after teardown. JavaScript keeps the React tree
mounted until that event arrives. Custom hosts that cannot use the binders can retain a
`GraniteMicroFrontendSessionRegistration` and call `openApp`, `setVisible`, and `closeApp` from their own lifecycle.

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
