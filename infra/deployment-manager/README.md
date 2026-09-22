# @granite-js/deployment-manager

## Deployment channels

All storage operations accept an optional `channel` in their context. Reuse the same context for state lookup,
uploads, history updates, rollout and cluster operations:

```ts
import { DeployManager, S3Client, type DeploymentContext } from '@granite-js/deployment-manager';

const context: DeploymentContext = {
  s3Client: new S3Client({ bucket: 'sample-bucket', region: 'us-east-1' }),
  channel: 'preview',
};

const deploymentId = await DeployManager.resolveDeploymentId(
  { appName: 'sample-app', groupId: '1', allowAccessCluster: false },
  context
);
const bundleKey = DeployManager.resolveBundle({
  appName: 'sample-app',
  platform: 'ios',
  deploymentId,
  channel: context.channel,
});
```

`resolveBundle` is a pure path builder, so its channel is supplied in the options instead of a storage context.
The exported `paths` helpers accept an optional final channel argument. Omission preserves existing paths;
an explicit channel prefixes every key with `channels/<channel>/`. Missing data is never read from another scope.

Names are case-sensitive and validated before storage access: 1–64 letters, digits, underscores or hyphens,
starting with a letter or digit. The public `validateChannel` helper can validate configuration before doing work.

Cluster rollout writes the `.deploymentInfo` pointer consumed by cluster readers and CDN invalidation.
Canary selection and rollback use the state loaded from the selected channel; callers must pass the same context
when writing the resulting state. A channel identifies a delivery namespace, not a bytecode compatibility check.
