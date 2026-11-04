---
'@granite-js/react-native': major
'create-granite-app': patch
---

Separate app registration from routing. Granite.registerApp now accepts only appName and renders the supplied app directly with initial props and visibility lifecycle. Move context, URL resolution, screen options, and gesture integration to an explicitly rendered Router.

Add core and router entry points. Router owns its navigation container and back-handler scope, accepts initialUrl and an injected onRootBack action, and supports hook-derived defaultScreenOptions through normal React props. The options callback receives routeIndex and onBack; defaultScreenOption remains a deprecated Router alias. Update generated apps and examples to the explicit composition API.
