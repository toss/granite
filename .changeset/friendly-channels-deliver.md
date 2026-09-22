---
'@granite-js/deployment-manager': minor
'@granite-js/forge-cli': minor
'@granite-js/pulumi-aws': minor
---

Add configurable deployment channels across Forge, deployment storage and the AWS CDN. Forge accepts `--channel`
for deployment and history. Named channels isolate bundle objects, state, history, cluster pointers, Lambda
query routing while omitted channels preserve existing paths and filename tags. App-scoped cache invalidation
covers all channel query variants. Missing channel deployments
never fall back to another namespace. Correct cluster rollout to write the `.deploymentInfo` pointer already
used by readers and cache invalidation.
