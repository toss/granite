---
'@granite-js/micro-frontend': minor
---

Native code that owns a Portal host on Android can embed it in part of a screen: `PortalReactRootView` takes `updatesSurfaceLayout`, so measuring an embedded root leaves the surface's layout constraints alone, and `PortalHostView.onChildCountChanged` reports when teleported content attaches or detaches.
