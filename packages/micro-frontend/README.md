# @granite-js/micro-frontend

Micro-frontend contracts for Granite React Native brownfield applications.

This package is the complete micro-frontend feature boundary. It contains:

- the build plugin that produces self-registering remote bundles;
- the JavaScript runtime that loads, evaluates, and imports remote modules;
- the Mono-Hermes native session and visibility contract;
- the host pending component contract; and
- the Portal primitive that attaches a mounted React subtree to an
  `Activity`- or `UIViewController`-owned destination.

`@granite-js/portal` is not a separate dependency. Portal is coupled to the
shared-runtime session contract and is exported from this package.

## Ownership model

```text
Granite brownfield host
├── native screen lifecycle
│   ├── session identity
│   └── presentation visibility
├── Brownfield Brick registry
│   └── close the current native view
├── one retained React Native runtime
│   ├── evaluate remote bundle
│   ├── keep one React tree per session
│   └── render each tree through Portal
└── native Portal destination
    └── attach content by the same sessionId
```

Native screen lifecycle is the source of truth for visibility. Portal only
owns where content is attached. A Portal host can remain attached while its
screen is stopped or covered, so Portal attachment must not be used to infer
presentation visibility.

The session identifier joins the contracts:

```text
register native session(sessionId)
  → openApp(sessionId, appName, scheme)
  → <MicroFrontendSessionProvider sessionId={sessionId}>
  → <Portal hostName={sessionId}>
  → native Portal host named sessionId
```

## Installation

```sh
yarn add @granite-js/micro-frontend
```

The package autolinks one Android library and one iOS Pod. Its React Native
Codegen library, `GraniteMicroFrontendRuntimeSpec`, contains both the
`GraniteMicroFrontendRuntime` TurboModule and the `PortalView` / `PortalHostView`
Fabric components.

## Build plugin

The app name comes from `granite.config.ts`. Hosts do not maintain a separate
remote-app list.

The generated runtime prelude uses a package-specific file name so this plugin
can coexist with the legacy `@granite-js/plugin-micro-frontend` plugin during a
gradual migration. This preserves both plugins' shared-module registrations.

```ts
// Remote app
import { microFrontend } from '@granite-js/micro-frontend/plugin';
import { defineConfig } from '@granite-js/react-native/config';

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
import { microFrontend } from '@granite-js/micro-frontend/plugin';
import { defineConfig } from '@granite-js/react-native/config';

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

When evaluated, a remote bundle registers its `appName` container and exposed
modules in the shared runtime registry.

## Registry migration contract

### As-is

Older bundles use `global.__MICRO_FRONTEND__` with `__INSTANCES__` and
`__SHARED__`. A compatible bundle adds `__CONTAINERS__` to the same canonical
context. Neither shape is a product router: an `appName` is the identity of one
remote registration.

### To-be

The durable owner is `global.__MICRO_FRONTEND__` with exactly this shape:

```ts
{
  __INSTANCES__,
  __SHARED__,
  __CONTAINERS__,
}
```

- `__INSTANCES__` preserves the legacy container view; `__SHARED__` is the
  shared-module registry; `__CONTAINERS__` is the current container registry.
- A current container registration creates paired legacy/current views for the
  same app name. The pair is transparent across separately evaluated bundles:
  it is one remote-owned registration, not two independently owned copies.
- The dispose callback registry and registrar live on the same canonical
  context as non-enumerable properties. They are reused across separately
  evaluated bundles without changing the three-key enumerable registry shape.

Bootstrap the canonical context before a compatible host evaluates a remote.
A compatible remote also installs the canonical bootstrap in its generated
prelude, so either compatible side can establish the three-store context before
the bundle registers its container.

The executable compatibility matrix is:

| Host       | Remote     | Required order | Status    |
| ---------- | ---------- | -------------- | --------- |
| Legacy     | Legacy     | Remote first   | Supported |
| Compatible | Compatible | Host first     | Supported |
| Compatible | Legacy     | Host first     | Supported |
| Legacy     | Compatible | Remote first   | Supported |

Registration is duplicate-safe, not aliasing: an occupied app name, duplicate
exposed module, or incompatible duplicate shared module is rejected. Removal
clears both paired container views as a unit, after which a fresh same-name
remote may register. Missing exposes, malformed occupied names, and
product-specific app-name remapping are unsupported; resolve the requested
app name exactly rather than routing it to another remote.

## JavaScript runtime

The adapter owns bundle selection, download, integrity verification, and
caching. It returns an absolute local bundle path.

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

`importApp('cart/App')` performs:

```text
adapter.loadBundle({ appName: 'cart' })
  → GraniteMicroFrontendRuntime.evaluateScript({ filePath })
  → verify that the cart container registered itself
  → return the cart container's ./App module
```

Concurrent preload/import calls for one app share an evaluation. A successful
evaluation remains cached for the lifetime of the JavaScript runtime. Failed
evaluation removes the partial container so a later request can retry.
Before evaluating a remote, the runtime also adapts the shared React Native
component registry so a native view wrapper already evaluated by the host can
be evaluated again by a separate remote bundle. The canonical host registration
is reused only for React Native's exact duplicate-view invariant; other registry
errors continue to fail the remote evaluation.
Native `preloadApp` events invoke `preloadApp()` inside the runtime and are not
forwarded to session listeners. `onPreloadError` is optional and lets the host
route best-effort native preload failures to its observability provider.

The public runtime API is:

| API                        | Responsibility                                                  |
| -------------------------- | --------------------------------------------------------------- |
| `preloadApp(appName)`      | Load and evaluate one app without importing an exposed module.  |
| `importApp(request)`       | Ensure the app is evaluated and import `appName/exposedModule`. |
| `evaluateScript(filePath)` | Evaluate an already-local bundle in the retained runtime.       |
| `onEvent(listener)`        | Subscribe to native open, close, and visibility events.         |

Remote code can register an idempotent callback for explicit app-level resource
cleanup:

```ts
globalThis.__MICRO_FRONTEND__.dispose(() => {
  queryClient.clear();
});
```

The micro-frontend plugin assigns the remote app name at build time through
Granite's common `transformer.transformSync` source path, which is used by both
Metro and Mpack. When `closeApp(sessionId)` removes an app's last live session,
the session owner invokes all callbacks registered for that app. Callbacks stay
registered, so a reopened app invokes them again on its next last close.
The `disposeAppResources` helper that runs those callbacks is internal lifecycle
machinery and is not part of this package's public exports. Closing a session
releases only its React state and native binding: the successful evaluation,
paired container, exposed modules, shared modules, and pending app routes remain
cached for the lifetime of the JavaScript runtime, so reopening the app does not
load or evaluate its bundle again. Failed evaluation still removes its partial
registration so a later request can retry.

## Session rendering

The brownfield host owns the product-specific session track. Compose the Portal
destination with `MicroFrontendSessionProvider` so native presentation state
joins Granite's existing visibility context.

```tsx
const sessions = useMicroFrontendSessions(runtime);

function SessionRoot({ session }: { readonly session: MicroFrontendSessionState }) {
  const App = useMemo(() => lazy(() => runtime.importApp(`${session.appName}/App`)), [session.appName]);

  return (
    <Portal hostName={session.sessionId}>
      <MicroFrontendSessionProvider sessionId={session.sessionId} presentationVisibility={session.isVisible}>
        <App scheme={session.scheme} />
      </MicroFrontendSessionProvider>
    </Portal>
  );
}
```

`useMicroFrontendSessions(runtime)` owns the fixed React subscription and folds
native open, close, and visibility events into session descriptors. The host
continues to own module selection and the rendered Portal tree.

The provider exposes the native session identity and combines
`presentationVisibility` with Granite's existing `VisibilityChangedProvider`.
Remote apps continue to read the final app, navigation, and native-session
visibility through `useVisibility()`.

Remote apps use Granite's `useVisibility()` for visibility and
`closeView()` to close the current brownfield view. They do not receive
`sessionId` as an application prop.

## Host pending component

Remote apps register a route-level pending component with this package's
`createRoute` wrapper.

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

The host resolves `PendingHostComponent` from the incoming scheme. The route
registry and hidden state live on the JavaScript global object, so separately
bundled host and remote package instances share the same state.

## Native event contract

The Codegen TurboModule is named `GraniteMicroFrontendRuntime`.

```ts
interface Spec extends TurboModule {
  evaluateScript(request: { readonly filePath: string }): Promise<void>;
  startEventDelivery(): void;
  readonly onEvent: CodegenTypes.EventEmitter<NativeMicroFrontendRuntimeEvent>;
}
```

These methods are implemented by this package. A brownfield application does
not implement another TurboModule. Request objects are used so optional fields
can be added without changing positional arguments. `startEventDelivery()`
is internal runtime plumbing.

Native emits the following events:

| Event                      | Required params                  | Meaning                                                                                                                                                                                                         |
| -------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preloadApp`               | `appName`                        | Warm an app.                                                                                                                                                                                                    |
| `openApp`                  | `sessionId`, `appName`, `scheme` | Create the session's React tree.                                                                                                                                                                                |
| `sessionVisibilityChanged` | `sessionId`, `isVisible`         | Update presentation visibility from native lifecycle.                                                                                                                                                           |
| `closeApp`                 | `sessionId`                      | Remove the session tree and binding. If this was the app's last live session, run its registered dispose callbacks while retaining the evaluated app, registry entries, shared modules, and pending app routes. |

Events emitted before JavaScript subscribes are queued. Event delivery starts
after the runtime installs its first listener.

## Brownfield integration checklist

The brownfield application must:

1. retain one React Native runtime and the controller surface that renders the
   session track;
2. create a unique `sessionId` for every native destination screen;
3. resolve `appName` and the incoming `scheme` at the native navigation
   boundary;
4. bind native screen lifecycle to the session APIs below;
5. install a Portal destination with the same `sessionId`;
6. provide `adapter.loadBundle()` and return an absolute verified bundle path;
7. keep the React tree mounted until native teardown emits `closeApp`; and
8. keep Granite's base brownfield view APIs, such as scheme resolution and
   closing the current Granite view, in the Granite host integration. They are
   not duplicated by this package.

The container-owned Brownfield Brick registry defines how the current native
view closes. JavaScript uses Granite's `closeView()` command. The session
lifecycle remains separate: native emits `closeApp(sessionId)` only when the
container actually tears down so JavaScript can unmount its React tree.

## Android native API

All public Android APIs live in `run.granite.microfrontend`, except the Portal
destination views in `com.teleport.host`.

### Session APIs

| API                                                                 | Lifetime / behavior                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActivitySessionBinding.bind(activity, sessionId, appName, scheme)` | Convenience binding for an `Activity`. Emits open, derives visibility from start/stop, and emits close on destroy. Bindings are keyed by `sessionId`, so a destroy caused by a configuration change keeps the session open and the next `bind()` with the same id rebinds the recreated instance instead of opening a second session. Use a `sessionId` that identifies the destination, not the Activity instance. Retain it for the Activity lifetime. |
| `GraniteMicroFrontendRuntimeHost.registerSession(sessionId)`        | Register a custom native container and return a `GraniteMicroFrontendSessionRegistration`. `sessionId` must be unique for every live destination; reuse only after the previous registration is closed/invalidated.                                                                                                                                                                                                                                      |
| `GraniteMicroFrontendSessionRegistration.openApp(appName, scheme)`  | Emit `openApp` once.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GraniteMicroFrontendSessionRegistration.setVisible(isVisible)`     | Emit a visibility event only when the value changes.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GraniteMicroFrontendSessionRegistration.closeApp()`                | Emit `closeApp` once after open.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `GraniteMicroFrontendSessionRegistration.close()`                   | Unregister the native session. Call after `closeApp()`.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `GraniteMicroFrontendRuntimeHost.emitPreloadApp(appName)`           | Fire-and-forget preload.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### Portal destination APIs

| API                                                              | Lifetime / behavior                                                                                                                     |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `PortalHostView.setName(name)`                                   | Register/unregister the destination name. Use `sessionId`.                                                                              |
| `PortalHostView.cleanup()`                                       | Permanently unregister the destination during teardown.                                                                                 |
| `PortalReactRootView(context, reactHost, surfaceId, moduleName)` | Detached Fabric root that forwards touch/pointer events through the retained `ReactHost`; it does not start another runtime or surface. |

`PortalHostView` also re-registers on window attachment and temporarily
unregisters while detached. `nextInsertionIndexForChildAt()` is renderer
plumbing, not an application integration API.

#### Props the Portal components do not apply

`Portal` and the Portal host component are renderer plumbing, not styleable
views. Their TypeScript props extend `ViewProps` because React Native's codegen
only accepts `ViewProps` as a base, so the type advertises more than the native
managers apply. The following are accepted by the type checker and silently
ignored on Android: `pointerEvents` (the native manager pins it to `box-none`
so touches reach the portalled tree), `hitSlop`, `focusable`, `accessible`,
`nativeBackgroundAndroid`, `nativeForegroundAndroid`, `borderStyle`,
`overflow`, `backfaceVisibility`, `collapsable`, `collapsableChildren`,
`needsOffscreenAlphaCompositing`, `background*` shorthands, `hasTVPreferredFocus`
and the `nextFocus*` family.

Wrap the Portal in your own `<View>` when you need any of these.

### Activity example

```kotlin
import android.os.Bundle
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactHost
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ThemedReactContext
import com.teleport.host.PortalHostView
import com.teleport.host.PortalReactRootView
import run.granite.microfrontend.ActivitySessionBinding

class CartActivity : AppCompatActivity() {
  // The session id identifies the destination, not the Activity instance. A value generated per
  // instance changes on every configuration change, so rotation would close and reopen the session
  // and remount the React tree. Derive it from what the caller navigated to.
  private val sessionId: String
    get() = requireNotNull(intent.data?.host) {
      "CartActivity requires the destination name as the URI host"
    }

  private lateinit var sessionBinding: ActivitySessionBinding
  private var portalHostView: PortalHostView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val scheme = requireNotNull(intent.data).toString()

    sessionBinding = ActivitySessionBinding.bind(
      activity = this,
      sessionId = sessionId,
      appName = "cart",
      scheme = scheme,
    )
  }

  fun installPortalHost(
    reactContext: ReactApplicationContext,
    reactHost: ReactHost,
    controllerSurfaceId: Int,
    controllerModuleName: String,
  ) {
    val themedContext = ThemedReactContext(
      reactContext,
      this,
      controllerModuleName,
      controllerSurfaceId,
    )
    val rootView = PortalReactRootView(
      themedContext,
      reactHost,
      controllerSurfaceId,
      controllerModuleName,
    )
    val hostView = PortalHostView(themedContext).apply { setName(sessionId) }

    rootView.addView(
      hostView,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT,
      ),
    )
    portalHostView = hostView
    setContentView(rootView)
  }

  override fun onDestroy() {
    portalHostView?.cleanup()
    portalHostView = null
    super.onDestroy()
  }
}
```

Install the Portal host only after the retained `ReactHost` has an active
`ReactApplicationContext`. The brownfield runtime owner still forwards normal
resume, pause, destroy, and back events to its retained `ReactHost`.

Custom screen containers use `registerSession()` and drive `openApp()`,
`setVisible()`, `closeApp()`, and `close()` from their own lifecycle.

## iOS native API

Import public APIs from `GraniteMicroFrontendRuntime`.

```objc
#import <GraniteMicroFrontendRuntime/GraniteMicroFrontendRuntimeHost.h>
#import <GraniteMicroFrontendRuntime/PortalHostContainerView.h>
```

### Session APIs

| API                                                                                                | Lifetime / behavior                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `+[GraniteMicroFrontendViewControllerSessionBinding bindViewController:sessionId:appName:scheme:]` | Convenience binding for a `UIViewController`. Emits open and derives visibility from `viewWillAppear` / `viewWillDisappear` combined with app foreground and background transitions. Returns `nil` if `sessionId` is already registered. Retain until teardown. |
| `-[GraniteMicroFrontendViewControllerSessionBinding invalidate]`                                   | Emit close and detach lifecycle observation.                                                                                                                                                                                                                    |
| `+[GraniteMicroFrontendRuntimeHost registerSession:]`                                              | Register a custom container and return a session registration, or `nil` if `sessionId` is already registered. Use a unique id per destination and call `invalidate` before reuse.                                                                               |
| `-[GraniteMicroFrontendSessionRegistration openAppWithAppName:scheme:]`                            | Emit `openApp` once.                                                                                                                                                                                                                                            |
| `-[GraniteMicroFrontendSessionRegistration setVisible:]`                                           | Emit visibility only when it changes.                                                                                                                                                                                                                           |
| `-[GraniteMicroFrontendSessionRegistration closeApp]`                                              | Emit `closeApp` once after open.                                                                                                                                                                                                                                |
| `-[GraniteMicroFrontendSessionRegistration invalidate]`                                            | Unregister the session. Call after `closeApp`.                                                                                                                                                                                                                  |
| `+[GraniteMicroFrontendRuntimeHost emitPreloadApp:]`                                               | Fire-and-forget preload.                                                                                                                                                                                                                                        |

### Portal destination APIs

| API                                         | Lifetime / behavior                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `-initWithFrame:`                           | Create and immediately activate a UIKit-owned Portal destination after React has booted.                          |
| `-initWithFrame:deferredActivation:`        | Create before React boot without reading React feature flags.                                                     |
| `-setName:`                                 | Register/unregister the destination name. Use `sessionId`.                                                        |
| `-activateIfNeeded`                         | Create the Fabric host, attach its touch handler, and apply the pending name. Main thread only, after React boot. |
| `isActivated`                               | Whether the underlying Fabric host exists.                                                                        |
| `hasAttachedContent`                        | Whether teleported content is currently attached. This is readiness, not presentation visibility.                 |
| `onContentDidAttach` / `onContentDidDetach` | Main-thread readiness callbacks for the first attach and last detach.                                             |
| `-invalidate`                               | Unregister the host and clear callbacks during teardown.                                                          |

### UIViewController example

```swift
import GraniteMicroFrontendRuntime
import UIKit

final class CartViewController: UIViewController {
  /// Create a new id for every push/present. Reusing an id before the previous
  /// binding is invalidated fails registration.
  private let sessionId = UUID().uuidString
  private var sessionBinding: GraniteMicroFrontendViewControllerSessionBinding?
  private var portalHostView: PortalHostContainerView!

  override func viewDidLoad() {
    super.viewDidLoad()

    portalHostView = PortalHostContainerView(
      frame: view.bounds,
      deferredActivation: true
    )
    portalHostView.setName(sessionId)
    view.addSubview(portalHostView)

    sessionBinding = GraniteMicroFrontendViewControllerSessionBinding.bindViewController(
      self,
      sessionId: sessionId,
      appName: "cart",
      scheme: "granite://cart/products/1"
    )
  }

  func reactRuntimeDidStart() {
    portalHostView.activateIfNeeded()
  }

  deinit {
    sessionBinding?.invalidate()
    portalHostView?.invalidate()
  }
}
```

Create, activate, and invalidate these objects on the main thread. Call
`invalidate` during teardown so the binding and Portal destination are released
with the controller.

## Portal primitive and example

`Portal` remains public for a Portal-only integration or test fixture:

```tsx
import { Portal } from '@granite-js/micro-frontend';

<Portal hostName="store">
  <StoreNavigationContainer />
</Portal>;
```

The React subtree keeps the same owner, context, and state while its native
views move to the named destination. Host names are application data; a
generic native destination should read the requested name at runtime.

See [examples/portal/README.md](examples/portal/README.md) for the retained
Portal-only cross-Activity / UIViewController example.

## License and credit

Apache-2.0. The Portal implementation is based on
[react-native-teleport](https://github.com/kirillzyusko/react-native-teleport)
by Kiryl Ziusko; see [NOTICE](NOTICE) and
[LICENSE.react-native-teleport](LICENSE.react-native-teleport).
