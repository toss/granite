---
'@granite-js/image': patch
---

fix(android): cancel the provider request of an image view when `GraniteImage` replaces or clears it, and ignore progress and completion callbacks from replaced requests. Providers no longer keep replaced image views (and their Activity) after a recycled cell changes its URI, and stale requests no longer emit `onLoad`/`onError`/`onProgress` for the current image.
