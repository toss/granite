# @granite-js/portal

Attach a React Native portal to a host owned by an Android `Activity` or an iOS
`UIViewController`.

## Product definition

`@granite-js/portal` moves a mounted React Native view to a native
`PortalHost`. The destination host can live in the view hierarchy owned by a
different `Activity` or `UIViewController`.

The React subtree keeps the same owner, context, and state while its native
view moves. The product is the host-level portal primitive; navigation and
microfrontends are consumers of that primitive.

## Microfrontend use case

A representative use case is keeping one React Native runtime while each
microfrontend owns an independent `NavigationContainer`:

```text
one React Native runtime
├── Store NavigationContainer  ──portal──> Store Activity / ViewController
└── Wallet NavigationContainer ──portal──> Wallet Activity / ViewController
```

Native navigation changes the destination host, not the React Native runtime.
Each navigation tree therefore remains mounted when the user moves between
native screens.

```tsx
import { Portal } from '@granite-js/portal';

export function MicrofrontendController() {
  return (
    <>
      <Portal hostName="store">
        <StoreNavigationContainer />
      </Portal>
      <Portal hostName="wallet">
        <WalletNavigationContainer />
      </Portal>
    </>
  );
}
```

Host names are application data. A generic native host reads the requested
name at runtime and attaches the matching portal, so adding another
microfrontend does not require another host `Activity` or `UIViewController`
class.

## Installation

```sh
yarn add @granite-js/portal
```

## Brownfield integration

The brownfield app owns the native destination screen. It must:

1. keep the React Native runtime and controller surface that mounted `<Portal>` alive;
2. create one native portal host in the destination `Activity` or `UIViewController`;
3. register that host with the same `hostName` passed to `<Portal>`; and
4. unregister the host when the native screen is torn down.

Portal owns content attachment, not native screen visibility. An attached
portal can remain in the view hierarchy while its `Activity` is stopped or its
`UIViewController` is no longer visible. On iOS, use `hasAttachedContent`,
`onContentDidAttach`, and `onContentDidDetach` for destination readiness. Use
the native screen lifecycle on both platforms for presentation visibility.

When this package is used with `@granite-js/micro-frontend`, use the native
session identifier as the portal host name on both sides:

```tsx
<Portal hostName={session.sessionId}>
  <RemoteApp />
</Portal>
```

### Android

Wait until the existing `ReactHost` has an active `ReactApplicationContext`,
then install a `PortalHostView` in a `PortalReactRootView` owned by the
destination `Activity`. `controllerSurfaceId` and `controllerModuleName` must
refer to the already-mounted controller surface; this does not start another
React Native runtime or surface.

```kotlin
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactHost
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ThemedReactContext
import com.teleport.host.PortalHostView
import com.teleport.host.PortalReactRootView

class MicroFrontendActivity : AppCompatActivity() {
  private var portalHostView: PortalHostView? = null

  fun attachPortal(
    reactContext: ReactApplicationContext,
    reactHost: ReactHost,
    controllerSurfaceId: Int,
    controllerModuleName: String,
    sessionId: String,
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
    val hostView = PortalHostView(themedContext).apply {
      setName(sessionId)
    }

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
    portalHostView?.setName(null)
    portalHostView = null
    super.onDestroy()
  }
}
```

The brownfield runtime owner is also responsible for forwarding the usual
`Activity` resume, pause, destroy, and back events to its retained `ReactHost`.

### iOS

Add a `PortalHostContainerView` to the destination controller and register the
session identifier. The container installs the Fabric touch handler required
by content moved outside the original React view hierarchy.

If the controller can be created before React Native boots, use deferred
activation and call `activateIfNeeded()` on the main thread after the runtime
is ready.

```swift
import GranitePortal
import UIKit

final class MicroFrontendViewController: UIViewController {
  private let sessionId: String
  private let portalHostView = PortalHostContainerView(
    frame: .zero,
    deferredActivation: true
  )

  init(sessionId: String) {
    self.sessionId = sessionId
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    nil
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    portalHostView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(portalHostView)
    NSLayoutConstraint.activate([
      portalHostView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      portalHostView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      portalHostView.topAnchor.constraint(equalTo: view.topAnchor),
      portalHostView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    portalHostView.setName(sessionId)
  }

  func reactRuntimeDidStart() {
    portalHostView.activateIfNeeded()
  }

  deinit {
    portalHostView.invalidate()
  }
}
```

Use `PortalHostContainerView(frame:)` instead when the React runtime is already
ready before the controller is created.

## Example

The Android example demonstrates:

- native `MainActivity` to a React Native portal host;
- React Native to another native `MainActivity` through `Linking.openURL`;
- React Native to a second portal host through a URI scheme;
- independent Store and Wallet `NavigationContainer` state in one React Native
  runtime.

See [example/README.md](example/README.md) for the exact flow. The
`UIViewController` host is part of the product boundary; this repository's
cross-host PoC currently validates the Android `Activity` path.

## Credit

Based on [react-native-teleport](https://github.com/kirillzyusko/react-native-teleport)
by Kirill Zyusko. The original project established the native re-parenting
implementation that this Activity / View Controller host integration extends.

## License

MIT
