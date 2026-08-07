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
    async loadBundle(appName) {
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
adapter.loadBundle('cart')
  → GraniteMicroFrontendRuntime.evaluateScript({ filePath })
  → verify that the cart container was registered
  → return the cart container's ./App module
```

Concurrent preload/import calls for the same app share one evaluation. A successful evaluation remains cached for
the JavaScript runtime lifetime. A failed evaluation and its partial container are removed so a later call can retry.

## Host skeleton

Remote apps register route skeletons with the package's `createRoute` wrapper. It delegates to Granite's
`createRoute` and additionally associates `skeletonComponent` with the current `granite.config.ts` app name, scheme,
and host.

```tsx
import { createRoute, hideHostSkeleton } from '@granite-js/micro-frontend';
import { useEffect } from 'react';

export const Route = createRoute('/products/:productId', {
  component: ProductPage,
  validateParams: parseProductParams,
  skeletonComponent: ({ thumbnailUrl }) => <ProductSkeleton thumbnailUrl={thumbnailUrl} />,
});

function ProductPage() {
  useEffect(() => {
    hideHostSkeleton();
  }, []);

  return <Product />;
}
```

The runtime host resolves the skeleton from the incoming URL. It resets the shared visibility state before opening a
new session and keeps the app content hidden until the remote app calls `hideHostSkeleton()`.

```tsx
import {
  HostSkeleton,
  useIsHostSkeletonHidden,
  useResolvedHostSkeleton,
} from '@granite-js/micro-frontend/host';

const resolved = useResolvedHostSkeleton(session.scheme);
const hidden = useIsHostSkeletonHidden();
const showSkeleton = resolved != null && !hidden;

<>
  <View style={{ flex: 1, opacity: showSkeleton ? 0 : 1 }}>
    <RemoteApp scheme={session.scheme} />
  </View>
  {showSkeleton ? <HostSkeleton url={session.scheme} /> : null}
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
    private lateinit var registration: GraniteMicroFrontendSessionRegistration

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registration = GraniteMicroFrontendRuntimeHost.registerSession(sessionId) {
            finish()
        }
        GraniteMicroFrontendRuntimeHost.emitOpenApp(
            sessionId,
            "cart",
            intent.data.toString(),
        )
    }

    override fun onStart() {
        super.onStart()
        GraniteMicroFrontendRuntimeHost.emitSessionVisibilityChanged(sessionId, true)
    }

    override fun onStop() {
        GraniteMicroFrontendRuntimeHost.emitSessionVisibilityChanged(sessionId, false)
        super.onStop()
    }

    override fun onDestroy() {
        GraniteMicroFrontendRuntimeHost.emitCloseApp(sessionId)
        registration.close()
        super.onDestroy()
    }
}
```

### iOS

```objc
self.registration =
    [GraniteMicroFrontendRuntimeHost registerSession:self.sessionId
                                        closeHandler:^{
  [viewController dismissViewControllerAnimated:YES completion:nil];
}];

[GraniteMicroFrontendRuntimeHost emitOpenApp:self.sessionId
                                     appName:@"cart"
                                      scheme:@"granite://cart/products/1"];
```

The native host emits `closeApp` after its close transition completes. JavaScript keeps the React tree mounted until
that event arrives.

## Session rendering

```tsx
import { Portal, PortalProvider } from '@granite-js/portal';
import {
  createMicroFrontendRuntime,
  MicroFrontendSessionProvider,
  type MicroFrontendRuntimeEvent,
} from '@granite-js/micro-frontend';
import { lazy, Suspense, useEffect, useReducer, type ComponentType, type LazyExoticComponent } from 'react';

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
          <MicroFrontendSessionProvider
            sessionId={session.sessionId}
            isVisible={session.isVisible}
            close={() => runtime.closeSession(session.sessionId)}
          >
            <Suspense fallback={null}>
              <App scheme={session.scheme} />
            </Suspense>
          </MicroFrontendSessionProvider>
        </Portal>
      ))}
    </PortalProvider>
  );
}
```

Remote apps use `useMicroFrontendSession()` to read visibility or request a close without receiving `sessionId` as an
application prop.
