---
'@granite-js/micro-frontend': patch
---

Keep a detached portal's press region on its host by measuring the PortalView transform relative to the host's React root view instead of the window. The window offset no longer goes into the transform, so `measureInWindow` stays window-relative only when the host sets the controller surface's viewport offset; React Native has no public API for that on a bridgeless surface (`ReactSurfaceImpl.updateLayoutSpecs` is internal).
