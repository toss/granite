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
│   ├── session identity and close action
│   └── presentation visibility
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
  → <MicroFrontendSessionRenderer sessionId={sessionId}>
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
evaluation remains cached until its last native session closes. Failed
evaluation removes the partial container so a later request can retry.

The public runtime API is:

| API | Responsibility |
| --- | --- |
| `preloadApp(appName)` | Load and evaluate one app without importing an exposed module. |
| `importApp(request)` | Ensure the app is evaluated and import `appName/exposedModule`. |
| `evaluateScript(filePath)` | Evaluate an already-local bundle in the retained runtime. |
| `closeSession(sessionId)` | Ask native to run the close action registered for that session. |
| `onEvent(listener)` | Subscribe to native preload, open, close, and visibility events. |

## Session rendering

`MicroFrontendSessionRenderer` owns the Portal composition. Consumers should
not wrap it in another Portal.

```tsx
<MicroFrontendSessionRenderer
  app={App}
  sessionId={session.sessionId}
  scheme={session.scheme}
  isVisible={session.isVisible}
  close={() => runtime.closeSession(session.sessionId)}
/>
```

It performs three jobs:

1. renders `<Portal hostName={sessionId}>`;
2. provides `useMicroFrontendSession()` with the session identity and close
   action; and
3. passes native presentation state to the Granite app as
   `presentationVisibility`.

Remote apps use Granite's `useVisibility()` for visibility and
`useMicroFrontendSession()` to request close. They do not receive `sessionId`
as an application prop.

## Host pending component

Remote apps register a route-level pending component with this package's
`createRoute` wrapper.

```tsx
import { createRoute, hidePendingHostComponent } from '@granite-js/micro-frontend';
import { useEffect } from 'react';

export const Route = createRoute('/products/:productId', {
  component: ProductPage,
  validateParams: parseProductParams,
  hostPendingComponent: ({ thumbnailUrl }) => (
    <ProductPendingComponent thumbnailUrl={thumbnailUrl} />
  ),
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
  requestCloseSession(request: { readonly sessionId: string }): Promise<void>;
  startEventDelivery(): void;
  readonly onEvent: CodegenTypes.EventEmitter<NativeMicroFrontendRuntimeEvent>;
}
```

These methods are implemented by this package. A brownfield application does
not implement another TurboModule. Request objects are used so optional fields
can be added without changing positional arguments. `startEventDelivery()`
is internal runtime plumbing.

Native emits the following events:

| Event | Required params | Meaning |
| --- | --- | --- |
| `preloadApp` | `appName` | Warm an app. |
| `openApp` | `sessionId`, `appName`, `scheme` | Create the session's React tree. |
| `sessionVisibilityChanged` | `sessionId`, `isVisible` | Update presentation visibility from native lifecycle. |
| `closeApp` | `sessionId` | Unmount the tree and release the app when its last session closes. |

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

Native owns how a destination closes. JavaScript `closeSession(sessionId)`
executes the registered native close action; it never searches for an
`Activity` or `UIViewController`.

## Android native API

All public Android APIs live in `run.granite.microfrontend`, except the Portal
destination views in `com.teleport.host`.

### Session APIs

| API | Lifetime / behavior |
| --- | --- |
| `ActivitySessionBinding.bind(activity, sessionId, appName, scheme)` | Convenience binding for an `Activity`. Emits open, derives visibility from start/stop, runs `finish()` on close request, and emits close on destroy. Retain it for the Activity lifetime. |
| `GraniteMicroFrontendRuntimeHost.registerSession(sessionId, closeAction)` | Register a custom native container and return a `GraniteMicroFrontendSessionRegistration`. |
| `GraniteMicroFrontendSessionRegistration.openApp(appName, scheme)` | Emit `openApp` once. |
| `GraniteMicroFrontendSessionRegistration.setVisible(isVisible)` | Emit a visibility event only when the value changes. |
| `GraniteMicroFrontendSessionRegistration.closeApp()` | Emit `closeApp` once after open. |
| `GraniteMicroFrontendSessionRegistration.close()` | Unregister the native session. Call after `closeApp()`. |
| `GraniteMicroFrontendRuntimeHost.emitPreloadApp(appName)` | Fire-and-forget preload. |

### Portal destination APIs

| API | Lifetime / behavior |
| --- | --- |
| `PortalHostView.setName(name)` | Register/unregister the destination name. Use `sessionId`. |
| `PortalHostView.cleanup()` | Permanently unregister the destination during teardown. |
| `PortalReactRootView(context, reactHost, surfaceId, moduleName)` | Detached Fabric root that forwards touch/pointer events through the retained `ReactHost`; it does not start another runtime or surface. |

`PortalHostView` also re-registers on window attachment and temporarily
unregisters while detached. `nextInsertionIndexForChildAt()` is renderer
plumbing, not an application integration API.

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
import java.util.UUID
import run.granite.microfrontend.ActivitySessionBinding

class CartActivity : AppCompatActivity() {
  private val sessionId = UUID.randomUUID().toString()
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

| API | Lifetime / behavior |
| --- | --- |
| `+[GraniteMicroFrontendViewControllerSessionBinding bindViewController:sessionId:appName:scheme:closeHandler:]` | Convenience binding for a `UIViewController`. Emits open and derives visibility from appearance callbacks. Retain until teardown. |
| `-[GraniteMicroFrontendViewControllerSessionBinding invalidate]` | Emit close and detach lifecycle observation. |
| `+[GraniteMicroFrontendRuntimeHost registerSession:closeHandler:]` | Register a custom container and return a session registration. |
| `-[GraniteMicroFrontendSessionRegistration openAppWithAppName:scheme:]` | Emit `openApp` once. |
| `-[GraniteMicroFrontendSessionRegistration setVisible:]` | Emit visibility only when it changes. |
| `-[GraniteMicroFrontendSessionRegistration closeApp]` | Emit `closeApp` once after open. |
| `-[GraniteMicroFrontendSessionRegistration invalidate]` | Unregister the session. Call after `closeApp`. |
| `+[GraniteMicroFrontendRuntimeHost emitPreloadApp:]` | Fire-and-forget preload. |

### Portal destination APIs

| API | Lifetime / behavior |
| --- | --- |
| `-initWithFrame:` | Create and immediately activate a UIKit-owned Portal destination after React has booted. |
| `-initWithFrame:deferredActivation:` | Create before React boot without reading React feature flags. |
| `-setName:` | Register/unregister the destination name. Use `sessionId`. |
| `-activateIfNeeded` | Create the Fabric host, attach its touch handler, and apply the pending name. Main thread only, after React boot. |
| `isActivated` | Whether the underlying Fabric host exists. |
| `hasAttachedContent` | Whether teleported content is currently attached. This is readiness, not presentation visibility. |
| `onContentDidAttach` / `onContentDidDetach` | Main-thread readiness callbacks for the first attach and last detach. |
| `-invalidate` | Unregister the host and clear callbacks during teardown. |

### UIViewController example

```swift
import GraniteMicroFrontendRuntime
import UIKit

final class CartViewController: UIViewController {
  private let sessionId: String
  private var sessionBinding: GraniteMicroFrontendViewControllerSessionBinding?
  private var portalHostView: PortalHostContainerView!

  init(sessionId: String) {
    self.sessionId = sessionId
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

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
    ) { [weak self] in
      self?.dismiss(animated: true) { [weak self] in
        self?.sessionBinding?.invalidate()
        self?.sessionBinding = nil
        self?.portalHostView.invalidate()
      }
    }
  }

  func reactRuntimeDidStart() {
    portalHostView.activateIfNeeded()
  }
}
```

Create, activate, and invalidate these objects on the main thread. Weakly
capture the controller in its close handler so the binding can be released
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
