---
'@granite-js/rn-component-view': minor
---

Add `@granite-js/rn-component-view`. `RNComponentView`, a native view on Android and iOS, shows one component registered with `AppRegistry.registerComponent`, updates its props, and sizes itself to the measured content. Mount `RNComponentViewRenderer` once in the runtime that renders the components, and call `installComponentProviderRecorder()` in a module that the entry imports first.
