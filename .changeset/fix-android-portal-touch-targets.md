---
'@granite-js/micro-frontend': patch
---

Keep Android Portal touch targets separate from native view IDs. Portal roots use their Fabric surface ID, and native hosts preserve Android IDs for saved state while routing background touches to the enclosing React root. React-managed hosts keep their registered tags and pointer-event behavior.
