---
'@granite-js/micro-frontend': patch
---

Add `PortalInitialContentMarker.isMarker(view)` on Android. It tells whether a view is the native view that the JS `PortalInitialContentView` component renders, so a host that walks a Portal view tree to find the content a session drew can skip these markers without checking the native view class.
