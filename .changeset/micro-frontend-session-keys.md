---
'@granite-js/micro-frontend': minor
---

Support optional native registry keys on session open and Activity/ViewController lifecycle bindings. Validate optional keys before mutating native session state, and report malformed native events without interrupting subsequent JS delivery.

Keep `rootKey` wire compatibility but deprecate the per-session copy: hosts should bootstrap their runtime-owned root binding independently of open sessions. Document that acknowledged opens are not replayed after runtime replacement and that hosts must close old registrations and open fresh native bindings.
