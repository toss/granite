---
'@granite-js/micro-frontend': patch
---

Add `shared[name].lazy` for host shared modules. With `eager: true, lazy: true` the host registers the module at startup but evaluates it on the first `get()`, so packages no remote uses yet don't run while the host bundle starts.
