---
'@granite-js/micro-frontend': patch
---

Portal hosts report a touch's `pageX`/`pageY` where `measure()` reports the teleported content, so a press on content in a host away from the screen origin no longer cancels when the finger moves. When a gesture starts, hosts have their Portals lay content out again, so content that moved with a scroll measures where it is.
