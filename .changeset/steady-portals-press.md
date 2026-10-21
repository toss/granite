---
'@granite-js/micro-frontend': patch
---

Add `measuresPortalsInRootView` to `PortalReactRootView`, off by default. A portal from a detached controller surface is positioned with its host's window offset, which `measureInWindow` needs but which also moves Pressability's press region above the host, so releases near a pressable's bottom edge are cancelled. When the option is on, such portals are positioned relative to the root view and their press regions stay on the host; the host app then sets the controller surface's viewport offset so `measureInWindow` stays window-relative, as the portal example's `ControllerSurfaceViewport` does. Without the option nothing changes.
