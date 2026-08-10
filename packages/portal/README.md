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
import { Portal } from "@granite-js/portal";

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
