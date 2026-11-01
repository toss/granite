---
'@granite-js/screen': patch
'@granite-js/react-native': patch
---

feat(ios): wrap the iOS `BackButton` in `GraniteBackButtonView`, a native view class from `@granite-js/screen`, so a host can find the header back button by its class, for example to draw a native back button in its place. `GraniteNativeFactoryDelegate` registers the view when it is created.

The view needs a native rebuild with this `@granite-js/screen`. App binaries without it render the button as before, still with the `granite.header.backButton` nativeID. Android is unchanged.
