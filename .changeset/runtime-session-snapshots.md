---
'@granite-js/micro-frontend': minor
---

Add `getSessions()` and `onSessionsChanged()` for observing ordered session snapshots outside React. Snapshots include session identity, app name, scheme, and native presentation visibility, and update as native events arrive without waiting for React commits or app disposal.

Keep session tracking active between consumer subscriptions and let `useMicroFrontendSessions()` read the same runtime-owned state, including sessions opened before it mounts. Existing lifecycle callbacks retain their commit and disposal timing.
