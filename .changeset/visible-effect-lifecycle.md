---
'@granite-js/react-native': minor
---

Add `useVisibilityEffect` to run an effect while a screen is visible and clean it up when visibility is lost, the callback changes, or the component unmounts.

Deprecate `useVisibilityChange` without changing its behavior. Use `useVisibilityEffect` for effects with cleanup, or `useVisibility` with React's `useEffect` for explicit visibility change handling.
