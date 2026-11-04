---
'@granite-js/react-native': minor
---

Add router.defaultScreenOptions with routeIndex and onBack callback arguments. routeIndex identifies each route's position in the stack, and onBack runs registered back handlers before navigating back or closing the host view. Keep defaultScreenOption as a deprecated alias with its original callback signature; TypeScript accepts only one option name at a time.
