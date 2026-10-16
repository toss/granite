---
'@granite-js/micro-frontend': patch
---

Add a session-scoped initial-content View that declares content for Fabric mount-completion observation without observation-specific props. Android and iOS Portal hosts can observe its native mount completion and destination attachment and apply their own first-draw policy.

Mount acknowledgment requires Bridgeless Fabric, a native rebuild containing the new component, and matching JavaScript. Older binaries without the component render a plain View without acknowledgment; they must not wait for this signal. Bridge-enabled iOS Fabric also uses this render-only fallback because its Paper UIManager cannot discover the Fabric-only component.
