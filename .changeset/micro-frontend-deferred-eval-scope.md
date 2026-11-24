---
'@granite-js/micro-frontend': minor
---

Add container initialization for remote bundles (like Module Federation's `beforeInitContainer`).

- `microFrontend()` (Rollipop) always initializes remote bundles (bundles with `exposes`) as containers: it defers the bundle's evaluation. The native evaluator (Android and iOS) then calls the bundle with an evaluation argument `{ sourceUrl }`.
- Every app instance (a copy of an app's modules: the bundle's first evaluation, or an instance made from its container definition without loading the bundle again) has an `instanceId` `<appName>@<n>`, numbered per app by the JavaScript runtime: `shopping@1`, `shopping@2`, and so on. `createMicroFrontendRuntime({ formatInstanceId })` formats them instead, with what the adapter's `loadBundle` returned for the defining evaluation (for example a deployment id); ids must stay unique.
- `createMicroFrontendRuntime({ instancePerSession })`: each session gets its own app instance. `runtime.importApp(request, { sessionId })` returns the module from the instance that belongs to that session: the one it took before, else one no session has used yet, else a new instance. A native preload leaves one instance no session has used yet. An instance never goes to another session, also after its session closed. `container.owner()` in `beforeInitContainer` reads the session an instance belongs to.
- `createMicroFrontendRuntime({ hooks: { beforeInitContainer } })`: runs once per container before its code runs. It may return a `shareScope` so that this container gets its own view of shared modules. Shared-module stubs read the container's share scope when one is present.

Compatibility: without the native deferred evaluator, or without the hook, bundles run immediately with the host's shared modules exactly as before. Both Android and iOS native evaluators pass the evaluation argument.
