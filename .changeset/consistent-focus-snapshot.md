---
'@granite-js/react-native': patch
---

Read navigation focus through `useSyncExternalStore` so focus changes between rendering and subscription are not missed by `useIsFocusedSafely`, `useVisibility`, or visibility effects. Preserve the focused fallback when no navigation context is available.

Visibility effects follow committed visibility snapshots with React's effect setup and cleanup lifecycle.
