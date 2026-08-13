---
'@granite-js/micro-frontend': patch
---

Forward shared module exports lazily so unused host getters are not evaluated during bundle loading.
