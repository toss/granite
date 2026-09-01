# @granite-js/micro-frontend

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
