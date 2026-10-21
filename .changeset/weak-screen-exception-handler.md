---
'@granite-js/screen': patch
---

fix(android): stop the ReactHost instance exception handler from retaining destroyed screens. Override `createInstanceExceptionHandler()` to keep handling exceptions after the screen is collected.
