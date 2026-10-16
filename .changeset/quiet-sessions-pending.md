---
'@granite-js/micro-frontend': patch
---

Preserve pending completion per native session and support explicit session IDs when reading or hiding pending UI. Release state when sessions close while retaining legacy single-screen behavior.

After a native session opens, string arguments to `hidePendingHostComponent` are session IDs; unknown or closed IDs are ignored. Wrap string-valued callbacks with `() => hidePendingHostComponent()` or pass the originating session ID explicitly. Hosts that never track native sessions retain legacy callback behavior, including string results. This pending-state change is JavaScript-only and does not require the new native initial-content component.
