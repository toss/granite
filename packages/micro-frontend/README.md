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

Configure the plugin in `rollipop.config.ts`. The `appName` identifies the
bundle in the shared runtime registry. See the
[Rollipop configuration documentation](https://rollipop.dev/docs/get-started/configuration)
for other build options.

The generated runtime prelude uses a package-specific file name so this plugin
can coexist with the legacy `@granite-js/plugin-micro-frontend` plugin during a
gradual migration. This preserves both plugins' shared-module registrations.

```ts
// Remote app
import { microFrontend } from '@granite-js/micro-frontend/plugin';
import { defineConfig } from 'rollipop';

export default defineConfig({
  plugins: [
    microFrontend({
      appName: 'cart',
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
import { defineConfig } from 'rollipop';

export default defineConfig({
  plugins: [
    microFrontend({
      appName: 'shared',
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

### Mpack (deprecated)

```ts
import { microFrontend } from '@granite-js/micro-frontend/plugin-mpack';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'cart',
  plugins: [microFrontend({ shared: ['react', 'react-native'] })],
});
```

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
- A current container exposes the evaluated bundle source through
  `runtime.sourceURL`. The generated prelude captures it from the bundle's
  evaluation stack once when registering the container. Legacy container
  adapters omit `runtime` until a compatible bundle is evaluated.
- `getAppName()` resolves the current bundle's structured source URL against
  the container registry. A host call returns the host container name, while a
  remote call returns that remote's name without reading a last-evaluated
  global value. `findAppNameBySourceURL(sourceURL)` exposes the same exact
  registry lookup for runtimes that already provide a structured source URL.
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
caching. It returns an absolute local bundle path, or an Android `assets://`
locator for a bundle packaged in the application.

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
  onLifecycleEvent(event) {
    reportMicroFrontendLifecycle(event);
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

| API                           | Responsibility                                                           |
| ----------------------------- | ------------------------------------------------------------------------ |
| `preloadApp(appName)`         | Load and evaluate one app without importing an exposed module.           |
| `importApp(request)`          | Ensure the app is evaluated and import `appName/exposedModule`.          |
| `evaluateScript(filePath)`    | Evaluate a local file or Android packaged asset in the retained runtime. |
| `onEvent(listener)`           | Subscribe to native open, close, and visibility events.                  |
| `getSessions()`               | Read the current immutable session snapshot.                             |
| `onSessionsChanged(listener)` | Subscribe to session snapshot changes.                                   |

Session snapshots contain `sessionId`, `appName`, `scheme`, and `isVisible`.
Sessions remain in opening order, including separate entries when the same app
has multiple sessions. A newly opened session starts with `isVisible: false`;
native visibility events update it, and `closeApp` removes it. Preloading an app
does not create a session.

```ts
const subscription = runtime.onSessionsChanged((sessions) => {
  updateSessionStatus(sessions);
});
updateSessionStatus(runtime.getSessions());

// Stop observing when the integration is no longer needed.
subscription.remove();
```

`getSessions()` only reads state. The first `onEvent` or `onSessionsChanged`
subscription starts native event delivery after installing the runtime's
listener. This can synchronously deliver queued events to the new subscriber.
Subscriptions do not replay the current snapshot; subscribe first, then read
`getSessions()` to initialize an observer without missing changes.

The runtime retains one native subscription for its lifetime, even while all
consumer subscriptions are removed. Later observers and React hosts can read
the current sessions without reconstructing past events. Native session events
update the snapshot before either kind of observer is notified, independently
of React commits and app disposal. A failing observer is reported without
preventing other observers from receiving the event.

Snapshots and their session objects are frozen. A real change creates a new
array while preserving unchanged session objects. Duplicate opens, unknown
session IDs, and repeated visibility values retain the same snapshot and do not
notify `onSessionsChanged` subscribers.

The host can provide `onLifecycleEvent` when creating the runtime for logging
and other observability integrations. Each event contains `session.id`,
`session.appName`, and the `activeSessions` snapshot when the callback is
emitted. The callback has the same lifetime as the runtime.

```ts
const runtime = createMicroFrontendRuntime({
  adapter,
  onLifecycleEvent(event) {
    reportMicroFrontendLifecycle({
      ...event,
      activeSessionCount: event.activeSessions.length,
    });
  },
});
```

`mounted` is emitted after the session is committed to React state. `unmounted`
is emitted after the session is removed. When the session was the app's last
active session, Granite waits for the app's registered dispose callbacks before
emitting `unmounted`. Callback failures are reported without interrupting the
session lifecycle.

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

`useMicroFrontendSessions(runtime)` subscribes to the runtime's session snapshot
with `useSyncExternalStore`. It reads the same state as non-React observers,
including sessions opened before the hook mounted. It continues to report
committed mount/unmount lifecycle events and run app disposal. The host owns
module selection and the rendered Portal tree.

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
6. provide `adapter.loadBundle()` and return an absolute verified bundle path,
   or an Android `assets://` locator for a verified packaged bundle;
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

### Observing initial content layout

`PortalInitialContentView` coordinates initial UI for the current
`MicroFrontendSessionProvider`. It derives the observation key from that session's
`sessionId` and uses revision `0`; callers do not provide a request or a readiness
flag. Rendering it outside a session provider throws `MissingMicroFrontendSessionError`.

Pass `url` to render a registered pending component while keeping the primary
application mounted. Ordinary View props and the ref belong to the outer container.
That container never carries a readiness marker. `id`, `nativeID`, and `collapsable`
are reserved, and `url` is consumed by the SDK rather than forwarded to a native View.

```tsx
import { MicroFrontendSessionProvider, Portal, PortalInitialContentView } from '@granite-js/micro-frontend';

<Portal hostName={sessionId}>
  <MicroFrontendSessionProvider sessionId={sessionId} presentationVisibility={isVisible}>
    <PortalInitialContentView url={initialUrl} style={{ flex: 1 }}>
      <App />
    </PortalInitialContentView>
  </MicroFrontendSessionProvider>
</Portal>;
```

When the URL resolves to a pending component and the pending store has not hidden
it, the SDK renders that component with its parsed route params in a marked,
absolute-fill wrapper. The pending wrapper ignores pointer events and is hidden
from accessibility, matching `PendingHostComponent`. The primary wrapper stays
mounted with zero opacity, disabled pointer events, hidden accessibility, and no marker.

When there is no matching pending component, or the application hides it through
`hidePendingHostComponent()`, the marker moves to the visible primary wrapper
without remounting the primary. `url={null}` also selects the primary. The primary
wrapper is inside the SDK's `Suspense` boundary with a `null` fallback; an unresolved
primary cannot make the outer container report readiness. Pending UI remains
outside that Suspense boundary. A selected pending component that returns `null`
has no native output and does not complete the native observation.

Omit `url` when the children are already the explicit initial UI, such as a host
error screen. In this mode the component renders one marked View directly and
does not coordinate pending content. Put an error boundary outside the coordinator
to catch errors from both branches, and render its fallback inside a no-URL
`PortalInitialContentView` under the same session provider.

The session provider and content View must use the same package instance. Both
can stay in the host bundle; the application needs no observation-specific props
or Context. The SDK uses the existing pending component store and its hide signal.
It does not add a per-session pending store or infer application-data readiness.
Render one `PortalInitialContentView` per observation request. A marked boundary
whose children produce no native views does not complete the observation.

An Android destination observes the session's marker:

```kotlin
hostView.setName(sessionId)
val observation = hostView.observeContentLayout(
  requestKey = sessionId,
  revision = 0,
) {
  // The native owner can now update its loading or transition policy.
}

// Cancel if the owner no longer needs the result.
observation.close()
```

Register and close the observation on the Android UI thread. Registration before
the host's first Window attachment is supported. The callback runs at most once,
on a pre-draw where the unique matching boundary is physically under this host
and attached to the same Window. The boundary and its ancestor path must have
visible, nonzero, settled layout, and the boundary must contain at least one
physical native descendant with visible, nonzero, settled layout. Empty, detached,
hidden, or layout-pending content does not complete the observation.
The observer always permits drawing; it never delays a frame or starts an animation.

An iOS destination observes the same marker through its UIKit-owned container:

```swift
container.setName(sessionId)
let observation = container.observeContentLayout(
  requestKey: sessionId,
  revision: 0
) {
  // The native owner can now update its loading or transition policy.
}

// Cancel if the owner no longer needs the result.
observation.cancel()
```

Register and cancel on the main thread. Registration before activation or Window
attachment is supported and does not activate a deferred container. While an
observation is pending on an attached, activated container, a display link checks
the same physical hierarchy, visibility, nonzero bounds, and settled-layout
conditions, including a native descendant beneath the boundary. Delivery is
one-shot and stops observing before calling `onReady`. The observer does not force
layout, block drawing, or control a transition.

Closing or cancelling, renaming, detaching, or cleaning up the destination cancels
pending observations. On iOS, `container.invalidate()` also cancels them.
A size change after the destination has established nonzero bounds also cancels them;
the initial zero-size-to-laid-out transition does not. Register a new observation
for a new attachment or layout request, using the current session ID and revision `0`.

The signal acknowledges the marked subtree's structural native layout. It does
not wait for a completed draw, so a host can receive it before allowing its first
draw. It does not establish business-data readiness, image decoding, WebView
loading, every descendant's latest Fabric update, or pixels being presented.
Native observation is available on Android and iOS. Host applications retain
responsibility for timeouts, cancelling observations they no longer need, and any
policy that postpones their own first draw. In particular, an iOS observation whose
boundary never becomes eligible keeps its display link active until cancelled or
its destination is torn down.

The UIKit behavior harness can be built on macOS with Xcode installed:

```sh
node packages/micro-frontend/test/ios/buildPortalContentLayoutHarnessApp.mjs
```

Install and launch the emitted Simulator `.app`. It displays a pass/fail result
and writes `granite-portal-content-layout-results.json` in its temporary directory.
The harness uses the production container and UIKit with React host/touch stubs;
it does not validate a complete Fabric mount or displayed content.

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

| API                                         | Lifetime / behavior                                                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-initWithFrame:`                           | Create and immediately activate a UIKit-owned Portal destination after React has booted.                                                                 |
| `-initWithFrame:deferredActivation:`        | Create before React boot without reading React feature flags.                                                                                            |
| `-setName:`                                 | Register/unregister the destination name. Use `sessionId`.                                                                                               |
| `-activateIfNeeded`                         | Create the Fabric host under an `RCTRootComponentView` anchor, attach the touch handler, and apply the pending name. Main thread only, after React boot. |
| `isActivated`                               | Whether the underlying Fabric host exists.                                                                                                               |
| `hasAttachedContent`                        | Whether teleported content is currently attached. This is readiness, not presentation visibility.                                                        |
| `onContentDidAttach` / `onContentDidDetach` | Main-thread readiness callbacks for the first attach and last detach.                                                                                    |
| `-invalidate`                               | Unregister the host and clear callbacks during teardown.                                                                                                 |

#### Touch handling under a Portal host

`-activateIfNeeded` mounts the Fabric host under an `RCTRootComponentView`
anchor:

```text
PortalHostContainerView       <- RCTSurfaceTouchHandler for all hosted content
└── RCTRootComponentView      <- anchor, never registered with Fabric
    └── PortalHostView        <- teleported content attaches here
```

react-native-screens attaches its own touch handler to any screen without an
`RCTRootComponentView` above it. Without the anchor every hosted screen would add
a second handler beneath the container's, and one tap would reach JS twice. The
anchor keeps a single handler and page coordinates relative to the container,
like content under a regular React Native root.

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
