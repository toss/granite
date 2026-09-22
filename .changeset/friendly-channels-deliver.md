---
'@granite-js/deployment-manager': patch
'@granite-js/forge-cli': patch
'@granite-js/pulumi-aws': patch
---

Add configurable deployment channels across Forge, deployment storage and the AWS CDN. Forge accepts `--channel`
for deployment and history. Named channels isolate bundle objects, state, history and cluster pointers.
Opt-in per-app path registrations support `/<platform>/<app>/<group>/<channel>` while preserving legacy default
and unregistered filename-tag routes. Channels are selected only by registered path suffixes.
App-scoped cache invalidation covers all selectors, and unique caller references prevent simultaneous requests
from colliding. Missing channel deployments never fall back to another namespace. Correct cluster rollout to
write the `.deploymentInfo` pointer already used by readers and cache invalidation.

The exported `paths` helpers now take one options object instead of positional arguments.
