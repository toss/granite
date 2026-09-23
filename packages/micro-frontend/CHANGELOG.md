# @granite-js/micro-frontend

## 2.5.4

### Patch Changes

- 271ef06: Put a detached portal source in the same measurement space React Native uses on Android.

  A controller surface that is not attached to a window cannot read its own position, so the portal
  offset was taken from the host origin and came out as zero. Fabric applies that offset as the
  portal's transform, and that transform is what `measureInWindow` reports — the rendered position
  comes from the host and never depended on it. The result was that a teleported subtree reported raw
  screen coordinates while an ordinary window-attached surface reported coordinates relative to the
  window's visible content area, the two disagreeing by the system bars inset. Anything consuming those
  coordinates natively — an app bridge that draws at a measured rect, for one — landed a status bar
  height off.

  The detached branch now asks `RootViewUtil.getViewportOffset` about the host instead of deriving the
  offset itself. That is the same call React Native makes to place a surface root, so the two stay in
  one space without this package restating the rule. It also keeps them together as that function
  changes: through 0.85 it subtracts the visible display frame, while 0.86 subtracts `WindowInsetsCompat`
  status bar and cutout insets and skips the subtraction entirely under edge-to-edge.

  Rendering and touch are unaffected. The teleported children are parented by the host, so they draw
  where the host puts them, and the touch path that dispatches to them does not follow this offset.
  - @granite-js/utils@2.5.4

## 2.5.3

### Patch Changes

- @granite-js/utils@2.5.3

## 2.5.2

### Patch Changes

- @granite-js/utils@2.5.2

## 2.5.1

### Patch Changes

- @granite-js/utils@2.5.1

## 2.5.0

### Patch Changes

- @granite-js/utils@2.5.0

## 2.4.0

### Minor Changes

- d1f3f02: Add `getSessions()` and `onSessionsChanged()` for observing ordered session snapshots outside React. Snapshots include session identity, app name, scheme, and native presentation visibility, and update as native events arrive without waiting for React commits or app disposal.

  Keep session tracking active between consumer subscriptions and let `useMicroFrontendSessions()` read the same runtime-owned state, including sessions opened before it mounts. Existing lifecycle callbacks retain their commit and disposal timing.

### Patch Changes

- 9c09be7: Prevent iOS Portal hosts from dispatching duplicate Fabric touch events when another React Native root owns the touched view. Preserve touch handling for plain hosted content and nested Portal hosts.
- d0a4bf4: Mount teleported iOS Portal content under an `RCTRootComponentView` anchor so react-native-screens treats hosted screens as root-mounted and stops attaching a second `RCTSurfaceTouchHandler` per screen. Hosted content now gets a single touch handler and container-relative page coordinates, like content under a regular React Native root.
  - @granite-js/utils@2.4.0

## 2.3.2

### Patch Changes

- f92bbc7: Register pending host components with the configured app scheme so route evaluation works before an initial URL is available and does not inherit another app's scheme.
  - @granite-js/utils@2.3.2

## 2.3.1

### Patch Changes

- 56a5ce8: Support evaluating Android bundles packaged under `assets://` locators.
  - @granite-js/utils@2.3.1

## 2.3.0

### Minor Changes

- 6a8eae2: Expose each evaluated app container's source URL through `AppContainer.runtime.sourceURL`, resolve the current container with `getAppName()`, and exact-match externally captured source URLs with `findAppNameBySourceURL()`.

### Patch Changes

- @granite-js/utils@2.3.0

## 2.2.0

### Minor Changes

- 2513bd8: Allow hosts to observe committed micro-frontend session mount and unmount transitions through an `onLifecycleEvent` runtime option with session metadata and an active-session snapshot.

### Patch Changes

- @granite-js/utils@2.2.0

## 2.1.1

### Patch Changes

- 4f7aad6: Reuse host native component registrations when remote bundles evaluate matching native wrappers.
  - @granite-js/utils@2.1.1

## 2.1.0

### Minor Changes

- 0d72b4d: Run retained remote app dispose callbacks when its last session closes without discarding its evaluated container.

### Patch Changes

- 975c8cf: Document the canonical cross-version micro-frontend registry contract.
  - @granite-js/utils@2.1.0

## 2.0.2

### Patch Changes

- e6a9c16: fix(micro-frontend): detect iOS JSI runtime without sending respondsToSelector: through RCTBridgeProxy
  - @granite-js/plugin-core@2.0.2
  - @granite-js/react-native@2.0.2
  - @granite-js/utils@2.0.2

## 2.0.1

### Patch Changes

- c0440e5: Republish the micro-frontend package with normalized internal dependency versions.
  - @granite-js/plugin-core@2.0.1
  - @granite-js/react-native@2.0.1
  - @granite-js/utils@2.0.1

## 2.0.0

### Patch Changes

- 864fa2a: Add the Granite micro-frontend runtime, TurboModule contract, native session host integration, Portal primitives, and build plugin.
- 864fa2a: Forward shared module exports lazily so unused host getters are not evaluated during bundle loading.
- 864fa2a: Route session visibility through Granite's existing visibility provider and expose native session lifecycle as React state so remote apps can continue using `useVisibility()`.
- Updated dependencies [864fa2a]
- Updated dependencies [864fa2a]
  - @granite-js/react-native@2.0.0
  - @granite-js/plugin-core@2.0.0
  - @granite-js/utils@2.0.0
