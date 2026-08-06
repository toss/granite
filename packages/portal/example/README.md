# Cross-Activity Portal Host PoC

This example is dedicated to validating one detached React Native controller
surface across multiple Android Activities.

## Runtime flow

1. Native `MainActivity` routes to `ReactNativePotalHostActivity` with the
   portal host URI `teleport-portal://cross-activity-primary`.
2. The generic host reads the URI host dynamically and displays the matching
   Northstar Store `NavigationContainer`.
3. Store RN pushes another native `MainActivity` with
   `teleport-example://cross-activity/main`.
4. That native screen can route to another `ReactNativePotalHostActivity`,
   proving the `Main → RN → Main → RN` stack.
5. Store RN opens the same host Activity with
   `teleport-portal://cross-activity-secondary`.
6. That instance dynamically selects the independent Harbor Wallet
   `NavigationContainer`; adding another portal host requires no Activity code
   change.
7. Android back returns to the previous Activity while both React Navigation
   trees remain mounted in the same React Native controller surface.

## Run on Android

Start Metro from this directory:

```sh
yarn start
```

In another terminal:

```sh
yarn android
```

The PoC is Android-specific. The iOS project remains only as the React Native
example scaffold.
