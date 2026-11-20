---
'@granite-js/micro-frontend': minor
---

Add container initialization for remote bundles (like Module Federation's `beforeInitContainer`).

- `microFrontend()` (Rollipop) always initializes remote bundles (bundles with `exposes`) as containers: it defers the bundle's evaluation. The native evaluator (Android and iOS) then calls the bundle with its evaluation identity `{ evalId, sourceUrl }`; `evalId` is minted for each evaluation.
- `createMicroFrontendRuntime({ hooks: { beforeInitContainer } })`: runs once per container before its code runs. It may return a `shareScope` so that this container gets its own view of shared modules. Shared-module stubs read the container's share scope when one is present.

Compatibility: without the native deferred evaluator, or without the hook, bundles run immediately with the host's shared modules exactly as before. Both Android and iOS native evaluators pass the evaluation identity.
