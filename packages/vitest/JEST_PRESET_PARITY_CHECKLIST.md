# React Native Jest Preset Parity Checklist

Baseline:
- `react-native/jest-preset.js`
- `react-native/jest/react-native-env.js`
- `react-native/jest/setup.js`
- `react-native/index.js`

Notes:
- This checklist is for gaps against the React Native Jest preset contract, not general Vitest improvements.

## Required Now

- [x] `.native.*` resolution parity
  - Add `.native.tsx`, `.native.ts`, `.native.jsx`, `.native.js` to the shared resolver extension order.
  - Keep `ios` ahead of `native`, matching the current iOS-first behavior.
  - Update package docs and tests with the new extension order.

## Deferred

- [x] Asset transform parity
  - RN Jest preset maps asset imports to `{ testUri }`.
  - Implemented as a Vitest plugin `load()` hook plus a CommonJS runtime fallback.

- [x] `prettier` workaround mock
  - RN `jest/setup.js` installs a guarded `jest.mock('prettier', ...)`.
  - Implemented in `setup.ts` through the packaged setup helper.

- [x] `transformIgnorePatterns` parity
  - RN Jest preset allowlists `jest-react-native` and `@react-native(-community)`.
  - Implemented as allowlisted mirroring, aliasing, and source transformation for installed RN-family packages.

## Extended Facade Parity

- [x] Add `unstable_NativeText`
- [x] Add `unstable_NativeView`
- [x] Add `unstable_TextAncestorContext`
- [x] Add `unstable_VirtualView`
- [x] Add `NativeComponentRegistry` to the top-level facade
- [x] Add `ReactNativeVersion`
- [x] Add `usePressability`
- [x] Add `VirtualViewMode`

## Extended Mock Surface Parity

- [x] Expand `RendererProxy` with:
  - `findHostInstance_DEPRECATED`
  - `getNodeFromInternalInstanceHandle`
  - `getPublicInstanceFromInternalInstanceHandle`
  - `getPublicInstanceFromRootTag`
  - `isChildPublicInstance`
  - `isProfilingRenderer`
  - `renderElement`
  - `sendAccessibilityEvent`
  - `unmountComponentAtNodeAndRemoveContainer`
