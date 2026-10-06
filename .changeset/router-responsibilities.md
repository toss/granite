---
'@granite-js/plugin-router': patch
---

Keep the router plugin focused on route generation and watching. Remove automatic `require.context` replacement with `import.meta.glob`; applications should manage page imports explicitly.
