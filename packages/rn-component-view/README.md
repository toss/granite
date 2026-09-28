# @granite-js/rn-component-view

Native views that show React Native components, sized by their content.

`RNComponentView` shows one component registered with
`AppRegistry.registerComponent` inside a native screen: it is a `FrameLayout` on
Android and a `UIView` on iOS. The view opens the component with props, sizes
itself to the content, and shows a placeholder until the content is ready. One
React Native runtime renders the components of every `RNComponentView` in the
app, so a view does not start a runtime or a surface of its own.

## How it works

```text
React Native runtime
└── surface that runs RNComponentViewRenderer (shows nothing itself)
    ├── <Portal hostName="session-a"><ProductCard {...props} /></Portal>
    └── <Portal hostName="session-b"><Banner {...props} /></Portal>

Native screen
├── RNComponentView   Portal host "session-a" shows ProductCard
└── RNComponentView   Portal host "session-b" shows Banner
```

Each `RNComponentView` owns a Portal host named after its session id and opens
a component session with a component name, props, a sizing, and optionally a
bundle that registers the component. Native code keeps the open sessions and
sends them to `RNComponentViewRenderer`, which renders each component into
`<Portal hostName={sessionId}>`, measures it, and reports the size back to the
view. The Portal comes from
[`@granite-js/micro-frontend`](../micro-frontend/README.md).

## Installation

```sh
yarn add @granite-js/rn-component-view @granite-js/micro-frontend
```

The package requires React Native's New Architecture. It autolinks one Android
library and one iOS Pod, `GraniteRNComponentView`, which use the native Portal
host of `@granite-js/micro-frontend`. Its Codegen library,
`GraniteRNComponentViewSpec`, contains the `GraniteRNComponentSessions`
TurboModule.

`@granite-js/micro-frontend` imports `@granite-js/react-native` for its route
and session helpers. An app that does not use Granite can resolve that import to
a stub in Metro.

## Rendering the components

Mount `RNComponentViewRenderer` once, in a surface of the runtime that renders
the components. It renders only into the Portal hosts, so the surface can stay
behind the native screens or out of the view hierarchy. The renderer renders
only components whose providers `installComponentProviderRecorder()` recorded,
and the recorder sees only the registrations made after it is installed.
Install it in a module of its own, and import that module first in the entry: a
call at the top of the entry itself runs too late when the entry imports modules
that register components. See
[Installing the provider recorder](#installing-the-provider-recorder).

```ts
// recordComponentProviders.ts
import { installComponentProviderRecorder } from '@granite-js/rn-component-view';

installComponentProviderRecorder();
```

```tsx
// index.js
import './recordComponentProviders'; // Keep this the first import.
import './components/ProductCard'; // Calls AppRegistry.registerComponent('ProductCard', ...).
import { RNComponentViewRenderer } from '@granite-js/rn-component-view';
import { AppRegistry } from 'react-native';

function RendererHost() {
  return <RNComponentViewRenderer />;
}

AppRegistry.registerComponent('RendererHost', () => RendererHost);
```

The native app starts a surface with the `RendererHost` module and tells its
views which surface that is; see the [Android](#android) and [iOS](#ios)
sections.

For each session, the renderer waits until the component is registered and
renders it into `<Portal hostName={sessionId}>` with the session props. Until
then the native view keeps its own placeholder. The renderer calls the component
provider once per session, as React Native does once per run, and remounts the
content when a component registers again under the same name. A component or
provider that throws renders nothing without affecting other sessions. When the
app does not include the native module, the renderer renders nothing.

| Sizing          | Layout                                                | Reported size    |
| --------------- | ----------------------------------------------------- | ---------------- |
| `contentHeight` | The view sets the width; the content sets the height. | Width and height |
| `contentSize`   | The content sets both, up to the window width.        | Width and height |
| `constrained`   | The view sets both, and the content fills it.         | None             |

A Portal lays content out in the host's bounds but does not report the content
size, so the renderer measures content with `onLayout` and reports it to the
view. Changes under half a point are not reported.

### Components in other bundles

A view can name a bundle file that registers its component. Pass the runtime
that `createMicroFrontendRuntime` of `@granite-js/micro-frontend` returns, and
the renderer evaluates each named bundle once per runtime before it renders the
component:

```tsx
function RendererHost() {
  return <RNComponentViewRenderer runtime={runtime} />;
}
```

Without `runtime`, the components must register in the bundles the runtime has
already evaluated, and a view that names a bundle stays empty.

### Installing the provider recorder

React Native keeps each provider inside the runnable that `registerComponent`
stores and has no API that returns it. The recorder wraps `registerComponent` to
remember providers: it replaces the `AppRegistry` accessor of the
`react-native` CommonJS exports, which named imports and the shared scope read
through, and still passes every registration on to React Native. It cannot
recover a registration made before it was installed. That component still runs
as an app root, but a view that shows it never becomes ready and keeps showing
its placeholder.

Imports are hoisted: every module a file imports evaluates before the file's own
first statement, wherever the `import` lines appear. This entry installs the
recorder after `ProductCard` has registered:

```tsx
// index.js: the recorder misses 'ProductCard'.
import { installComponentProviderRecorder } from '@granite-js/rn-component-view';

installComponentProviderRecorder();

import './components/ProductCard'; // Calls AppRegistry.registerComponent('ProductCard', ...).
```

React Native's Babel preset compiles it into `require` calls in the order they
run:

```js
var _rnComponentView = require('@granite-js/rn-component-view');
require('./components/ProductCard'); // Registers 'ProductCard' with the original AppRegistry.
(0, _rnComponentView.installComponentProviderRecorder)(); // Installs the recorder.
```

Bundlers that keep ES modules, such as esbuild, evaluate the modules in the same
order, and `ProductCard` still registers first with Metro's `inlineRequires`,
described below. Imported modules evaluate one after another in import order,
so a module that only installs the recorder and is imported first runs before
every other import of the entry. That is why the entry in
[Rendering the components](#rendering-the-components) imports
`./recordComponentProviders` first.

- Registrations in the entry's own code after the call are recorded, because
  only imports are hoisted.
- Components that a view's bundle registers are recorded. The renderer
  evaluates the bundle when the view opens its session, after the entry has
  run.
- Import the recorder module before any module that registers components,
  directly or through its own imports. Imports that register nothing, such as
  polyfills, can come before it.
- React Native's default Metro configuration turns on `inlineRequires`, which
  moves the `require` of an import with bindings to where a binding is first
  used. A module imported by name then evaluates only when one of its bindings
  is first used, which can be after the call even though its import comes
  first. Imports without bindings, like `import './recordComponentProviders'`,
  stay in place. Do not rely on the order that `inlineRequires` produces: it
  changes with the bundler configuration and with where the bindings are used.
- If the app's `package.json` declares `"sideEffects": false`, bundlers that
  honor it, such as esbuild, drop imports without bindings with only an
  `ignored-bare-import` warning, so the recorder is never installed. List the
  recorder module, and the modules that register components, in `sideEffects`.

The recorder does not see:

- components registered with `AppRegistry.registerConfig`, which registers them
  through React Native's internal `registerComponent` instead of the
  `AppRegistry` export. Register components that views show with
  `registerComponent`.
- calls through an `AppRegistry` or `registerComponent` reference taken before
  the recorder was installed, for example by a module that evaluated earlier and
  ran `const { AppRegistry } = require('react-native')` at its top level. Named
  imports, like `import { AppRegistry } from 'react-native'`, read `AppRegistry`
  each time they use it, so they see the recorder.
- calls through a namespace import that Babel compiled, as Metro does, when the
  namespace object was created before the recorder was installed: when its
  module evaluated, or with `inlineRequires` when the module first used it.
  Babel copies the `AppRegistry` accessor into the namespace object, so later
  calls through `import * as ReactNative from 'react-native'` still reach the
  original. Namespace objects that esbuild creates read through and see the
  recorder.

Calling `installComponentProviderRecorder()` more than once is safe: later calls
keep the installed recorder and return `true`. It returns `false` and warns when
imports still see the original `AppRegistry` after the replacement.

When a view's component is missing, the renderer warns after evaluating the
view's bundle, or right away when the view names no bundle:

| Warning                                                                                                            | Meaning                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RNComponentView component 'X' is unavailable: call installComponentProviderRecorder() before components register` | The recorder was never installed.                                                                                                                                                                             |
| `RNComponentView component 'X' is not registered with AppRegistry`                                                 | The recorder is installed but has no provider named `X`: nothing has registered `X` yet, or `X` registered before the recorder was installed or through a path it does not see. Check the import order first. |

## Native event contract

The Codegen TurboModule is named `GraniteRNComponentSessions`. This package
implements it; an app does not implement another TurboModule.

```ts
interface Spec extends TurboModule {
  startEventDelivery(): void;
  reportContentSize(request: { readonly sessionId: string; readonly width: number; readonly height: number }): void;
  readonly onEvent: CodegenTypes.EventEmitter<NativeRNComponentEvent>;
}
```

Native emits the following events:

| Event                  | Required params                                 | Meaning                                             |
| ---------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `openComponent`        | `sessionId`, `componentName`, `props`, `sizing` | Render the component. `bundleFilePath` is optional. |
| `updateComponentProps` | `sessionId`, `props`                            | Replace the component props.                        |
| `closeComponent`       | `sessionId`                                     | Remove the component.                               |

Native keeps component sessions as state rather than a queue. When a renderer
starts delivery, including in a restarted runtime, it first receives
`openComponent` for every open session with the latest props, then changes as
they happen. The first renderer that starts delivery receives the events until
its runtime goes away.

## Android

All public Android APIs live in `run.granite.rncomponentview`.

### RNComponentView

`RNComponentView` is a `FrameLayout` that shows one component. It opens its
component session the first time it is attached to a window and closes it on
`close()` or when the `Activity` of its context is destroyed. Detaching from the
window keeps the session: the Portal takes the content back and returns it on
the next attach.

```kotlin
private lateinit var componentView: RNComponentView
private val rendererListener = RNComponentRendererListener { isAttached ->
  if (isAttached) activateComponentView()
}

override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  componentView = RNComponentView(
    context = this,
    componentName = "ProductCard",
    props = mapOf("productId" to productId),
    sizing = RNComponentViewSizing.CONTENT_HEIGHT,
  )
  container.addView(componentView, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))

  RNComponentSessions.addRendererListener(rendererListener)
  if (RNComponentSessions.isRendererAttached) {
    activateComponentView()
  }
}

override fun onDestroy() {
  RNComponentSessions.removeRendererListener(rendererListener)
  super.onDestroy()
}

// The renderer runs inside the RendererHost surface, so that surface has started.
private fun activateComponentView() {
  componentView.activate(reactHost, rendererSurface.surfaceID, "RendererHost")
}
```

| API                                          | Behavior                                                                                                                                                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activate(reactHost, surfaceId, moduleName)` | Host the Portal under a `PortalReactRootView` of the surface that renders the components, which dispatches touches to JavaScript. Returns `false` while the React instance is not running or the surface has not started; call it again later. |
| `updateProps(props)`                         | Replace the props. A view that has not opened its session yet opens it with the latest props.                                                                                                                                                  |
| `listener`                                   | `shouldOpenSession()` can leave the view empty, `onSessionOpened()` follows the open, and `onContentSizeChanged()` reports the measured size in dp.                                                                                            |
| `placeholderView`                            | Covers the view until the content attaches and, for content-sized views, until the renderer measures it. Content-sized views take 48 dp before the first measurement. Its default color follows light and dark mode.                           |
| `isUnavailable`                              | Set when the content cannot show, for example because no renderer is attached. The view shows nothing and collapses its content-sized dimensions.                                                                                              |
| `close()`                                    | Close the session. The view stays empty.                                                                                                                                                                                                       |

A surface has id 0 until it starts, and `ReactHost` can report its React
instance running before it starts the surfaces waiting for it. A view activated
with id 0 would show its content but drop every touch, so `activate()` returns
`false` for it. Activate the views once the renderer is attached, as above:
by then its surface has started. Create, activate, update, and close the view
on the main thread.

### Component sessions

`RNComponentView` uses these APIs. A custom container registers a session and
pairs it with a `PortalHostView` of `@granite-js/micro-frontend` named after the
session id.

| API                                                                                          | Lifetime / behavior                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RNComponentSessions.registerSession(sessionId)`                                             | Register a component session and return an `RNComponentSessionRegistration`. Throws if `sessionId` is already registered. Use the Portal host name as the id. |
| `RNComponentSessionRegistration.openComponent(componentName, props, sizing, bundleFilePath)` | Open the component once. `props` must be JSON-compatible.                                                                                                     |
| `RNComponentSessionRegistration.updateProps(props)`                                          | Replace the props of an open component.                                                                                                                       |
| `RNComponentSessionRegistration.contentSizeListener`                                         | Main-thread callback with the measured content size in dp. Not called for `RNComponentViewSizing.CONSTRAINED`.                                                |
| `RNComponentSessionRegistration.close()`                                                     | Close the component and unregister the session.                                                                                                               |
| `RNComponentSessions.isRendererAttached`                                                     | Whether a JavaScript renderer receives component sessions. Listeners added with `addRendererListener()` hear about changes on the main thread.                |

## iOS

Import the public APIs from `GraniteRNComponentView`:

```objc
#import <GraniteRNComponentView/RNComponentView.h>
```

In Swift, `import GraniteRNComponentView`.

### RNComponentView

`RNComponentView` is a `UIView` that shows one component. It opens its
component session the first time it moves to a window and closes it when it is
deallocated. Leaving the window keeps the session: the Portal takes the content
back and returns it when the view moves to a window again.

```swift
let componentView = RNComponentView(
  componentName: "ProductCard",
  props: ["productId": productId],
  sizing: .contentHeight,
  bundleFilePath: nil,
  deferredActivation: true
)
stackView.addArrangedSubview(componentView)

// Activate once the renderer is attached, which means the React runtime has booted.
rendererObserver = NotificationCenter.default.addObserver(
  forName: .RNComponentRendererDidChange,
  object: nil,
  queue: .main
) { _ in
  if RNComponentSessions.isRendererAttached {
    componentView.activateIfNeeded()
  }
}
if RNComponentSessions.isRendererAttached {
  componentView.activateIfNeeded()
}
```

| API                                                                      | Behavior                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-initWithComponentName:props:sizing:bundleFilePath:`                    | Create a view whose Portal host activates immediately. Use it after the React runtime has booted.                                                                                                                                |
| `-initWithComponentName:props:sizing:bundleFilePath:deferredActivation:` | With `deferredActivation`, the Portal host waits for `-activateIfNeeded`, for views created before the React runtime boots.                                                                                                      |
| `-activateIfNeeded`                                                      | Activate a deferred Portal host. Main thread only, after React boot.                                                                                                                                                             |
| `-updateProps:`                                                          | Replace the props. A view that has not opened its session yet opens it with the latest props.                                                                                                                                    |
| `delegate`                                                               | `componentViewShouldOpenSession:` can leave the view empty, `componentViewDidOpenSession:` follows the open, and `componentView:didChangeContentSize:` reports the measured size in points.                                      |
| `placeholderView`                                                        | Covers the view until the content attaches and, for content-sized views, until the renderer measures it. Content-sized views take `placeholderSize` before the first measurement. Its default color follows light and dark mode. |
| `unavailable`                                                            | Set when the content cannot show, for example because no renderer is attached. The view shows nothing and collapses its content-sized dimensions.                                                                                |

Create, activate, and update the view on the main thread.

### Component sessions

`RNComponentView` uses these APIs. A custom container registers a session and
pairs it with a `PortalHostContainerView` of `@granite-js/micro-frontend` named
after the session id.

| API                                                                                    | Lifetime / behavior                                                                                                                             |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `+[RNComponentSessions registerSession:]`                                              | Register a component session, or return `nil` if `sessionId` is already registered. Use the Portal host name as the id.                         |
| `-[RNComponentSessionRegistration openComponentWithName:props:sizing:bundleFilePath:]` | Open the component once. `props` must be JSON-compatible.                                                                                       |
| `-[RNComponentSessionRegistration updateProps:]`                                       | Replace the props of an open component.                                                                                                         |
| `contentSizeHandler`                                                                   | Main-thread callback with the measured content size in points. Not called for `RNComponentViewSizingConstrained`.                               |
| `-[RNComponentSessionRegistration invalidate]`                                         | Close the component and unregister the session. Releasing the registration does the same.                                                       |
| `RNComponentSessions.isRendererAttached`                                               | Whether a JavaScript renderer receives component sessions. `RNComponentRendererDidChangeNotification` posts on the main thread when it changes. |

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
