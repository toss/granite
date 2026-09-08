---
'@granite-js/micro-frontend': minor
'@granite-js/react-native': minor
---

Add `runtime.sessions` for observing existing and future sessions outside React. Each session owns a separate React Navigation ref and exposes lifecycle subscriptions with per-session cleanup. Deprecate `onLifecycleEvent` while preserving its payloads and teardown timing through the new subscription path.

Registered apps accept a per-instance `navigationContainerRef` prop so hosts can connect the session handle without sharing registration-time refs between mounted app instances.
