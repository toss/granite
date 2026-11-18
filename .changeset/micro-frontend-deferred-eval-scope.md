---
'@granite-js/micro-frontend': minor
---

Android: support deferred bundle evaluation with an evaluation scope argument. When a bundle hands its body back through `globalThis.__GRANITE_DEFERRED_EVAL__`, the native evaluator calls it with `{ evalId, sourceUrl }` (a fresh `evalId` per evaluation). Bundles without the deferred wrapper evaluate exactly as before.
