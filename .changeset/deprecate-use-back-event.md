---
'@granite-js/react-native': patch
---

Deprecate `useBackEvent` in favor of `useBackHandler`. Handlers registered through `useBackHandler` receive a `BackEvent` object and can conditionally consume the back action by returning `true`. `useBackEvent` still works, but will be removed in a future release.
