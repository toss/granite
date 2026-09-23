---
'@granite-js/deployment-manager': patch
'@granite-js/forge-cli': patch
'@granite-js/pulumi-aws': patch
---

Add configurable deployment channels across Forge, deployment storage and the AWS CDN. Forge automatically
registers each app/channel selector in S3, so channel creation requires no per-channel infrastructure configuration.
Channel objects, state, history and cluster pointers are isolated under `channels/<channel>/`. Registered path
suffixes select channels while the legacy default and unregistered filename tags keep their existing routes.
Conditional selector reservations and checks against retained legacy bundles prevent tag/channel name conflicts
between updated publishers. Registration and rollout events invalidate service selectors, and unique invalidation
caller references prevent simultaneous requests from colliding. Missing channel deployments never fall back to
another namespace. Cluster rollouts now write the `.deploymentInfo` pointer used by readers and invalidation.

The exported `paths` helpers take one options object instead of positional arguments.
