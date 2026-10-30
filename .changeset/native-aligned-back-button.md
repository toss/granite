---
'@granite-js/react-native': patch
---

fix(ios): line the `BackButton` arrow up with the Toss iOS app's native back button. The arrow moves about 7.7pt to the right before iOS 27, and about 6.3pt to the left on iOS 27 and later, where apps built with the iOS 27 SDK draw navigation bars with Liquid Glass. The iOS button also gets the `granite.header.backButton` nativeID so a host can find it among header views, for example to draw a native back button in its place. Android is unchanged.
