# @granite-js/config

Configuration APIs and bundler adapter interfaces for Granite.

Exports `defineConfig`, `loadConfig`, `BundlerAdapter`, and shared build types. Adapter methods can access the resolved Granite configuration through `this.getContext()`. `@granite-js/react-native/config` re-exports this API.
