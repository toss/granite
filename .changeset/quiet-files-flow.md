---
'@granite-js/micro-frontend': patch
---

Prepare Android bundle snapshots outside the JavaScript queue while preserving
evaluation order and independence from later file changes. Avoid zero-initializing
file buffers before filling them, and release queued snapshots on invalidation.
