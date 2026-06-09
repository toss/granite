# Rollipop Migration Notes

- Rollipop is pinned to `1.0.0-alpha.22`.
- The experimental Granite Rollipop path generates `.granite/rollipop-entry.ts` and registers the app entry with `register(App)` so Hermes receives a script bundle rather than an ESM module export.
- The adapter enables Rollipop's native transform pipeline and sets `experimental.flow.requireDirective: false`, so services no longer need service-specific Flow filters for third-party React Native modules.
- React/React Native shared modules are expanded to React JSX runtimes and React Native internal subpaths. The adapter also removes Rollipop's default `InitializeCore.js` prelude when `react-native` is resolved through `virtual-shared:react-native`.
- React Native 0.84 uses Rollipop's default HMR implementation. The old showcase-local `hmr-client.ts`, `hmr-runtime.ts`, and `rollipop.config.mts` files were removed.
- For legacy React Native versions below 0.84, the adapter still uses Rollipop's exported HMR runtime/client and patches the client import from `DevLoadingView` to `LoadingView`.
- `build --experimental` and `dev --experimental` avoid loading mpack on the Rollipop path; mpack is imported only for the non-experimental path.
