---
'@granite-js/react-native': minor
---

Extend router.defaultScreenOption callbacks with routeIndex and onBack. routeIndex identifies the route's position in the current stack, and onBack preserves registered back handlers before navigating back or closing the host view. Existing object options and callbacks remain supported.
