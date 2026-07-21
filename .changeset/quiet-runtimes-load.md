---
'@granite-js/plugin-micro-frontend': patch
'@granite-js/react-native': patch
---

Add generic service-bundle loading primitives for evaluating independently built services in one JavaScript runtime. Expose the runtime mode so applications loaded this way automatically use an independent navigation tree while legacy applications keep their existing behavior.
