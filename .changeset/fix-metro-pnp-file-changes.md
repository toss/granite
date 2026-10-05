---
'@granite-js/mpack': patch
---

Fix Metro hot reloads for Yarn PnP workspace packages by forwarding physical file changes to their virtual module paths without losing peer dependency resolution.
