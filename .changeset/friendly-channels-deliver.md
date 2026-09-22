---
'@granite-js/deployment-manager': minor
'@granite-js/forge-cli': minor
'@granite-js/pulumi-aws': minor
---

Add configurable deployment channels across Forge, deployment storage and the AWS CDN. Forge accepts `--channel`
for deployment and history. Named channels isolate bundle objects, state, history and cluster pointers.
Opt-in per-app path registrations support `/<platform>/<app>/<group>/<channel>` while preserving legacy default
and unregistered filename-tag routes. Explicit query channels remain available for channel-plus-tag requests.
App-scoped cache invalidation covers both URL forms, and unique caller references prevent simultaneous requests
from colliding. Missing channel deployments never fall back to another namespace. Correct cluster rollout to
write the `.deploymentInfo` pointer already used by readers and cache invalidation.
