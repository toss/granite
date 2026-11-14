---
'@granite-js/micro-frontend': patch
---

Add `shared[name].lazy` for host shared modules. With `eager: true, lazy: true` the host registers the module at startup but evaluates it on the first `get()`, so packages no remote uses yet don't run while the host bundle starts.

With Rollipop, a lazy ESM package is registered through named imports read by getters instead of `require()`, so it keeps the same tree-shaking as an eager registration and its modules are evaluated when an export is first read.
