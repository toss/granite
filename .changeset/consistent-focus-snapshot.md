---
'@granite-js/react-native': patch
---

Read navigation focus through `useSyncExternalStore` so focus changes between rendering and subscription are not missed by `useIsFocusedSafely`, `useVisibility`, or visibility effects. Preserve the focused fallback when no navigation context is available.

Recheck navigation focus before starting visibility effects so a blur between render and subscription does not start a stale effect. Retry skipped effects after focus returns, including when blur and focus occur before the next render.
