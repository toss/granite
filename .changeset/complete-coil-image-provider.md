---
'@granite-js/image': patch
---

Complete the Android Coil provider with viewless preloading, disk cache clearing, byte progress, request priority scheduling, and GIF/SVG decoding. Allow application image loaders to be reused, preserve non-bitmap image dimensions and failure causes, and apply image props before starting requests. Reject failed preloads and wait for background disk cache clearing to finish.
