# Native Host Runtime Knowledge

## Package Role

`packages/granite-screen` is the native Android/iOS host integration package. It owns the native host surface where a Granite React Native bundle is loaded into an existing app.

## Android Host Model

On Android, `GraniteReactHost` and `GraniteReactDelegateImpl` are designed around an Activity-owned host by default.

The default Android flow is:

- A native `Activity` implements `GraniteReactHost`.
- The Activity provides a `BundleLoader`.
- The delegate asks the `BundleLoader` for a `BundleSource`.
- `ReactHostFactory` creates an independent `ReactHost` backed by Hermes.
- The delegate creates a `ReactSurface` and attaches its `ReactSurfaceView` to the Activity.

This means a production native app can have multiple Granite Activities alive at the same time. With the current default model, each Activity-owned delegate can create its own `ReactHost`, and each `ReactHost` can own its own Hermes JS runtime and React instance.

Use this mental model when answering runtime questions:

```text
Activity A -> GraniteReactDelegateImpl A -> ReactHost A -> Hermes runtime A -> shared bundle instance A
Activity B -> GraniteReactDelegateImpl B -> ReactHost B -> Hermes runtime B -> shared bundle instance B
```

The model is not "one Android process equals one ReactHost." The default code is closer to "one Granite Activity owns one host lifecycle." A singleton process-wide ReactHost is possible as a different integration design, but it is not the default shape in this repository and would make Activity, surface, back stack, and memory management more complex.

## Shared App Instance Scope

The reserved `shared` app name is a JS entry identity inside a React Native runtime, not a process-wide singleton.

Within one JS runtime, `shared` should be registered once. If two Android Activities each create their own Granite host with independent `ReactHost` instances, each host has its own Hermes JS runtime and can evaluate its own `shared` bundle instance.

In that case JS globals, module instances, React state, and `global.__MICRO_FRONTEND__` are runtime-local and duplicated, even if the downloaded bundle file or native libraries are shared at the process or filesystem level.

Bundle files and native libraries can be cached or shared at the app layer, but evaluated JavaScript state is not shared across independent ReactHosts. If multiple Granite screens need cross-screen state, prefer an app-level native store, persisted storage, backend state, or explicit initial props/events instead of assuming JavaScript memory is shared.

## Native Integration Boundary

Bundle download, local cache management, CDN URL selection, and production remote-bundle evaluation can live in the native app integration layer. Do not assume they are fully implemented by `packages/granite-screen` or `packages/plugin-micro-frontend` unless the relevant native implementation is present in the repository.

Native callers can pass initial props into the Granite surface. A production host can use those props to tell the shared app which remote route or remote app should be displayed. The shared app must still coordinate with the native remote-bundle loader so the selected remote bundle is downloaded, evaluated in the current runtime, and registered before rendering.
