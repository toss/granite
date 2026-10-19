---
'@granite-js/micro-frontend': patch
---

Allow Android hosts to opt into observing legacy revision-zero initial-content
markers. Explicit identity props remain authoritative, and legacy markers must
still complete a Fabric mount with their internal sentinel.
