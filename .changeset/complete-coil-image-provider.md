---
'@granite-js/image': patch
---

Complete the Android Coil provider with viewless preloading, disk cache clearing, byte progress, request priority scheduling, and GIF/SVG decoding. Allow application image loaders to be reused, preserve non-bitmap image dimensions and failure causes, and apply image props before starting requests. Keep preload batches best-effort and resolve after all requests complete. Memory-cache hits bypass request scheduling, and disk cache clearing finishes before its promise resolves.

The default provider now creates its own image loader instead of using Coil's global singleton. Applications that configured the singleton must pass it explicitly to `CoilImageProvider(applicationContext, imageLoader = Coil.imageLoader(applicationContext))` to continue sharing its caches, networking configuration, and decoders.
