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

The following example assumes a session-based host with `MicroFrontendSessionProvider`.
Legacy single-screen hosts without this provider can continue calling `hidePendingHostComponent()` without an ID.

```tsx
import { createRoute, hidePendingHostComponent, useMicroFrontendSession } from '@granite-js/micro-frontend';
import { useEffect } from 'react';

export const Route = createRoute('/products/:productId', {
  component: ProductPage,
  validateParams: parseProductParams,
  hostPendingComponent: ({ thumbnailUrl }) => <ProductPendingComponent thumbnailUrl={thumbnailUrl} />,
});

function ProductPage() {
  const { sessionId } = useMicroFrontendSession();

  useEffect(() => {
    hidePendingHostComponent(sessionId);
  }, [sessionId]);

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

| API                                                              | Lifetime / behavior                                                                                                                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PortalHostView.setName(name)`                                   | Register/unregister the destination name. Use `sessionId`.                                                                                                                                      |
| `PortalHostView.cleanup()`                                       | Permanently unregister the destination during teardown.                                                                                                                                         |
| `PortalReactRootView(context, reactHost, surfaceId, moduleName)` | Detached Fabric root that forwards touch/pointer events through the retained `ReactHost`; it does not start another runtime or surface.                                                         |
| `PortalReactRootView(..., measuresPortalsInRootView = true)`     | Position portals from a detached controller surface relative to this root view, so their press regions stay on the host. The app then owns the controller surface's viewport offset; see below. |

By default a portal from a detached controller surface is positioned with its host's window
offset, which `measureInWindow()` reports as is. Pressability measures its press region with
`measure()`, which includes that position too, so the press region sits above the host by the
window offset (the status bar, or the window position in split screen and freeform) and a release
near the bottom edge of a pressable cancels the press. With `measuresPortalsInRootView = true` the
press region matches the host, and `measureInWindow()` takes the window offset from the controller
surface's viewport offset instead. React Native leaves that at (0, 0) for a surface never attached
to a window and has no public API to set it on a bridgeless surface; the portal example's
`ControllerSurfaceViewport` sets it from the resumed host through an internal React Native handle,
so treat it as app code to recheck on React Native upgrades. Give every root view that hosts one
controller surface's portals the same value.

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

`PortalInitialContentView` declares the initial content whose Fabric mount completion
should release a native host. Its public props and ref remain ordinary View props
and a View ref; internally it uses a Fabric component that records mount completion.
It derives the observation key from the current `MicroFrontendSessionProvider`'s
`sessionId` and uses revision `0`. No observation-specific props are required.
On supported native hosts, rendering it outside a session provider throws `MissingMicroFrontendSessionError`.
On older apps without this native component, it renders an ordinary `View`, preserving props,
ref, and children without requiring a session provider or emitting a mount acknowledgment.
Mount acknowledgment through this component is supported on **Bridgeless Fabric** hosts.
The availability check uses `UIManager.hasViewManagerConfig`, which queries the native component
registry in Bridgeless mode. With the bridge enabled, it queries Paper view managers instead;
on iOS it cannot discover this Fabric-only component, so the wrapper renders the plain View fallback.
The fallback preserves rendering only: hosts must enable an acknowledgment-based first-draw guard
only with a supported runtime and matching JavaScript and native component. A JavaScript-only update
does not add this capability to an older binary or require older hosts to implement a guard.

```tsx
import { MicroFrontendSessionProvider, Portal, PortalInitialContentView } from '@granite-js/micro-frontend';

<Portal hostName={sessionId}>
  <MicroFrontendSessionProvider sessionId={sessionId} presentationVisibility={isVisible}>
    <PortalInitialContentView>
      <InitialContent />
    </PortalInitialContentView>
  </MicroFrontendSessionProvider>
</Portal>;
```

The component forwards ordinary View props and its ref to an internal native boundary.
A private, absolute zero-size child identifies its initial Fabric insertion, including
when the boundary was preallocated. That child has no touch or accessibility content.
Session identity travels through private native props, independently of ordinary `id`/`nativeID`.
Only `collapsable` is reserved: the boundary always remains in the native hierarchy.
It does not select routes, render pending UI, hide content, or add a Suspense boundary.
The UI owner chooses the content and places this boundary around the initial UI
whose native layout should release the host's first-draw guard. Pending screens,
Suspense fallbacks, and error screens remain the UI owner's responsibility.

The session provider and content View can use separate package copies in the same runtime with shared React.
Render one `PortalInitialContentView` per observation request. Rendering the marker
is an explicit declaration: empty, hidden, or zero-size content can complete once
its mount has completed. Granite does not infer readiness from descendant counts,
bounds, visibility, layout-request flags, timers, or frame polling.

An Android destination observes the session's marker:

```kotlin
hostView.setName(sessionId)
val observation = hostView.observeContentLayout(
  requestKey = sessionId,
  revision = 0,
) {
  // The native owner can now release its first-draw guard.
}

// Cancel if the owner no longer needs the result.
observation.close()
```

Register and close the observation on the Android UI thread. Registration before
the host's first Window attachment is supported. A context-free listener installed
with the native package observes `FABRIC_BATCH_EXECUTION_START/END`, emitted inside
Fabric's actual native mount instruction executor. Only marker ViewManager mutations
within that execution are associated with its commit number and a unique local epoch.
The private child's insertion supplies an explicit mutation even for a preallocated
marker. A matching END acknowledges the mutation; unrelated batches, preallocation,
and aborted executions without END cannot complete it. The marker's surface and
identity are revalidated before delivery. This also covers deferred surface mounts.

An iOS destination observes the same marker through its UIKit-owned container:

```swift
container.setName(sessionId)
let observation = container.observeContentLayout(
  requestKey: sessionId,
  revision: 0
) {
  // The native owner can now release its first-draw guard.
}

// Cancel if the owner no longer needs the result.
observation.cancel()
```

Register and cancel on the main thread. Registration before activation or Window
attachment is supported and does not activate a deferred container. The internal
iOS component implements `RCTMountingTransactionObserving` and records the surface
and transaction after `mountingTransactionDidMount`, following the last mutation.
Only transactions whose mutation list contains the marker or its child membership
can acknowledge it. Removing the private child invalidates completion on both platforms.

On both platforms, delivery requires exactly one matching internal marker physically
beneath the destination and attached to its Window, with a completed native mount
for that instance and identity. A new marker mutation invalidates the previous
acknowledgment until its exact mount execution finishes. Unrelated transactions
and synchronous non-Fabric prop updates do not manufacture a new acknowledgment. Replacing or recycling a native view cannot
reuse its predecessor's acknowledgment. Delivery runs outside Fabric's observer
iteration, revalidates identity and attachment, and removes the observation before
calling `onReady`. Android can deliver a completed acknowledgment during pre-draw,
with queued delivery also available when no traversal occurs. iOS queues delivery.
A late subscriber can consume an existing acknowledgment.
A plain View, including the compatibility fallback, cannot acknowledge a Fabric mount.

Closing or cancelling, changing or clearing an existing name, detaching, or cleaning up the
destination cancels pending observations. The first name can be assigned after subscribing.
On iOS, `container.invalidate()` also cancels observations. Size changes
preserve observations; the signal does not wait for a subsequent commit incorporating
the latest host size. Register again after a new attachment, using the current session
ID and revision `0`.

The signal acknowledges Fabric's native mount completion, including the layout
mutations in that mount. It does not establish business-data readiness, image decoding,
WebView loading, future commits, or pixels being presented. The observer does not
force layout, delay drawing, or control a transition. Host applications retain
responsibility for timeouts, cancellation, and any policy postponing their first draw.
For mount acknowledgment, both the JavaScript package and the native binary must include the internal component;
there is no fallback to heuristic readiness on older native binaries.

The UIKit behavior harness can be built on macOS with Xcode installed:

```sh
node packages/micro-frontend/test/ios/buildPortalContentLayoutHarnessApp.mjs
```

Install and launch the emitted `.app` on an iOS 18 or later Simulator. It displays a pass/fail result
and writes `granite-portal-content-layout-results.json` in its temporary directory.
The harness uses the production container and mount ledger with UIKit and React
host/touch stubs. It injects transaction boundaries to verify acknowledgment delivery;
it does not validate a complete Fabric runtime or displayed content.

The opt-in iOS specs also compile and execute the production `GranitePortalInitialContentView.mm`
and mount ledger against small React input stubs. They cover UTF-8 props (including embedded NUL),
transaction filtering, child mounting, and recycling; Fabric scheduling itself remains outside this harness.
Run them against a booted Simulator with `GRANITE_IOS_TOUCH_HARNESS_SIMULATOR=<simulator-id>`
and `yarn workspace @granite-js/micro-frontend test src/portal/PortalHostContainerView.ios.spec.ts`.

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
| `hasAttachedContent`                        | Whether teleported content is attached; this does not acknowledge Fabric mount completion or presentation visibility.                                    |
| `onContentDidAttach` / `onContentDidDetach` | Main-thread callbacks for the first content attachment and last detachment.                                                                              |
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

### Session-scoped pending completion

For hosts with multiple concurrent sessions, pass `sessionId` to
`useIsPendingHostComponentHidden(sessionId)` or `<PendingHostComponent url={url} sessionId={sessionId} />`.
Granite creates pending state when the runtime accepts `openApp` and releases it on `closeApp`.
Completion survives visibility changes, host remounts, other sessions opening, and legacy global resets.
Duplicate open events do not reset an existing session. Session IDs must uniquely identify a session lifetime.

Remote components can use `useMicroFrontendSession()` to capture their ID and call
`hidePendingHostComponent(sessionId)` when ready. Capture the ID before asynchronous work:
a late completion for a closed session is ignored and cannot complete another session.
The provider and hook share their Context across copies of this package in the same JS runtime;
React must still be shared between host and remote bundles. Update both package copies to a version
with this shared Context when using the hook across bundles.

For backward compatibility, calls without an ID still update the legacy global flag and complete
only the most recently opened session that remains open. They cannot identify the origin of late
asynchronous work; concurrent applications should migrate to explicit IDs. The no-argument
`resetPendingHostComponent()` resets only the legacy global flag, never session completion.
Explicit completion of the latest open session also updates the legacy flag, so hosts using the
no-argument pending APIs still observe that completion. Non-string callback arguments are treated like
an omitted ID: the call still completes the latest open session and updates the legacy flag.
Hosts that have never accepted a native session retain the legacy behavior for all callback arguments,
including strings. Once session tracking has started, string arguments are interpreted as session IDs;
unknown or closed IDs are ignored, including after the last session closes. In those hosts, wrap
string-valued callbacks with `() => hidePendingHostComponent()` or capture an explicit session ID.
Hosts using the legacy single-screen controller can continue using its existing API.


## License and credit

Apache-2.0. The Portal implementation is based on
[react-native-teleport](https://github.com/kirillzyusko/react-native-teleport)
by Kiryl Ziusko; see [NOTICE](NOTICE) and
[LICENSE.react-native-teleport](LICENSE.react-native-teleport).

## Experimental execution ownership

The `executionOwnership` compiler option preserves opaque execution identities across supported async and callback boundaries. Hosts supply lifetime IDs and map them to native resources; this package does not depend on a registry implementation.

The independent `rnexecution` C++ core is currently shipped with this native package. It owns runtime-local scope state and opaque snapshots, and restores the previous scope on normal and exceptional exits. A scope covers one synchronous execution segment: returning a Promise does not extend it until settlement. The JavaScript facade uses this backend after host installation, with a reference implementation available before installation and for non-native fixtures.

The compiler lowers async functions and instruments supported global scheduler reads and native Promise methods. This feature does not replace global schedulers or `Promise.prototype` methods. Ordinary listener callbacks and user-defined methods are not indiscriminately wrapped. React renderer and native callback entry points use explicit adapters.

The exercised renderer profile is React Native 0.84 Fabric. Top-level await is unsupported. Uninstrumented code, arbitrary dynamic property lookup, custom schedulers, and native event producer isolation require separate integration and validation. This is a bounded execution-context facility, not a complete `AsyncLocalStorage` compatibility implementation. Semantic equivalence and performance outside the tested paths remain under review.
