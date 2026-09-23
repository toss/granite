# @granite-js/pulumi-aws

A Pulumi package for managing React Native CDN infrastructure on AWS.

## Installation

Follow the official Pulumi installation guide to install the Pulumi CLI:

- [Pulumi Installation Guide](https://www.pulumi.com/docs/iac/download-install/)

## Pulumi Configuration

```bash
pulumi new aws-typescript
```

Then, install the `@granite-js/pulumi-aws` package and dependencies:

```bash
npm install @granite-js/pulumi-aws
# or
yarn add @granite-js/pulumi-aws
# or
pnpm add @granite-js/pulumi-aws
```

## Usage

To use the `ReactNativeBundleCDN` component, import it into your Pulumi program and instantiate it with the required arguments:

```typescript
import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { ReactNativeBundleCDN } from '@granite-js/pulumi-aws';

const config = new pulumi.Config();

const reactNativeCdn = new ReactNativeBundleCDN('myReactNativeBundleCDN', {
  bucketName: config.require('bucketName'),
  region: config.require('region'),
});

// Print to CLi
export const url = cdn.cloudfrontDomain;
```

Ensure your configuration variables (`bucketName` and `region`) are set in the Pulumi configuration:

```bash
pulumi config set bucketName your-bucket-name
pulumi config set region us-west-2
```

## AWS Credentials Setup

Configure your AWS credentials for Pulumi by exporting your AWS credentials as environment variables:

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="your-region"
```

Alternatively, configure your AWS credentials using the AWS CLI:

```bash
aws configure
```

## Deploying with Pulumi

To deploy your infrastructure, run:

```bash
pulumi up
```

Review the changes that Pulumi proposes, then confirm deployment. Pulumi will provision your React Native CDN infrastructure on AWS.

## Deployment channels

Deploy the channel-aware infrastructure once. Subsequent channel creation is handled by Forge, without changing
the Pulumi configuration or redeploying Lambda for each channel:

```sh
granite-forge deploy --bucket sample-bucket --channel next
```

Forge gets the app name from the Granite config and registers the app/channel pair in S3 before uploading the
platform bundles. Shared and app bundles are separate deployments and should use the same channel name.

```text
/ios/sample-app/1/bundle   -> existing unscoped default bundle
/ios/sample-app/1/next     -> next channel's default bundle
/android/shared/1/next    -> next channel's shared bundle
```

### S3 registration and lookup

The selector record is stored outside the channel's mutable rollout state:

```text
deployments/sample-app/selectors/next.json
  {"version":1,"type":"CHANNEL"}

channels/next/deployments/sample-app/deployment_state
channels/next/bundles/sample-app/<deploymentId>/bundle.ios.hbc.gz
```

On a CloudFront cache miss, the origin-request Lambda reads the selector record and then resolves deployment
state in the selected channel. The URI is rewritten to its S3 bundle key. `bundle` bypasses registration lookup
and keeps the legacy path. A missing registration keeps the existing filename-tag behavior; a registered channel
with missing deployment state returns 404, never a legacy bundle. Invalid metadata or storage access errors fail
instead of being interpreted as an unregistered selector. Lambda does not keep an in-process registration cache.
Query parameters do not select or override channels.

Numeric groups from 1 to 1000 retain their rollout meaning within the chosen channel. Named clusters still require
`allowAccessCluster`; the component's default handler keeps cluster access disabled.

### Backward compatibility and concurrent publishers

`--channel` omission preserves existing S3 keys and URLs. `bundle` is reserved and cannot be a channel name.
Channel names follow the [Forge CLI rules](../forge-cli/README.md#deployment-channels).

Before creating a channel, the deployment manager lists all pages under `bundles/<app>/` and rejects a matching
legacy tag on either platform, including retained objects from older deployments. New legacy tagged uploads
reserve the same selector key with `{"version":1,"type":"LEGACY_TAG"}`. Conditional S3 writes (`If-None-Match: *`)
ensure one owner when tag and channel registrations race. Repeated registration of the same kind is idempotent;
it does not overwrite or invalidate an existing registration.

Upgrade legacy tag publishers to the updated deployment manager before enabling channel creation. Older writers
cannot honor reservations. Checks cover retained visible objects and registration records, so do not reuse known
legacy names after deleting their artifacts. Keep selector records permanently: failed uploads do not remove a
channel registration or enable legacy fallback. Retrying the deployment uses the same registration.

Deployment credentials need `s3:ListBucket` for the legacy bundle prefix in addition to object read/write access.
Lambda only reads registrations and deployment state; it does not scan legacy objects. The extra registration
read occurs on cache misses for channel-like suffixes, not every cached request.

### Cache invalidation

S3 notifications watch `deployments/` and `channels/`. Selector registrations, deployment-state updates and cluster
pointer changes reach the cache-removal Lambda. Registration events clear previously cached legacy/missing-selector
responses, and the final rollout update invalidates again after both platform uploads succeed.

For `deployments/sample-app/selectors/next.json` or `channels/next/deployments/sample-app/deployment_state`, the paths are:

```text
/ios/sample-app/*
/android/sample-app/*
```

Invalidation covers the affected service across its channels; other services are unaffected. Another channel may
incur a cache miss but retains its own deployment state and bundle. Cluster changes narrow this to the affected
cluster. History and bundle uploads do not invalidate selectors. This remains asynchronous; a successful Forge
command does not mean CloudFront invalidation has finished. See [AWS invalidation path rules](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html).

### Shared bundles and rollout order

The component bootstraps its prebuilt shared bundle only into the existing unscoped namespace. Publish compatible
shared and app bundles explicitly to each channel. Routing does not validate bytecode/runtime compatibility or
make separate shared/app publications atomic.

Install and verify the common Lambda code and S3 notifications before enabling channel URLs in clients. The old
Lambda interprets the last segment as a filename tag. Wait for selector invalidations before enabling new clients,
including clearing any responses cached before the infrastructure upgrade. After this one-time upgrade, deploying
a new channel only writes S3 data; it needs no per-channel infrastructure configuration.

Review the complete Pulumi preview before any future apply: the existing component also manages the legacy
shared bundle and deployment pointer.

### Offline Lambda simulation

From the repository root, build the deployment manager and run the Lambda scenarios with Vitest:

```sh
yarn workspace @granite-js/deployment-manager build
yarn workspace @granite-js/pulumi-aws test:lambda
```

The simulation invokes the real origin-request, origin-response and cache-removal handlers, together with the
deployment manager. S3 operations use in-memory objects and CloudFront commands are intercepted, so no AWS
credentials, uploads, invalidations or deployments are needed. Gzipped fixture bytes are uploaded through the
deployment manager, selected through Lambda and decompressed to verify the returned artifact.

| Scenario                                | What is verified                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Default, named channels, app and shared | Both platforms return their own bytes and metadata, even with identical deployment IDs                               |
| Registration and publication            | A registered but unpublished channel returns 404; retry succeeds without legacy fallback                             |
| Upload failure                          | Failure on either platform leaves the previous rollout and history unchanged                                         |
| Canary and rollback                     | All 1,000 groups on both platforms resolve correctly at 0, 1, 50, 99 and 100 percent                                 |
| Legacy compatibility                    | Default URLs and tags retain their namespace; tag ownership blocks channel takeover                                  |
| Read failures                           | Missing state/artifacts, pending state, corrupt metadata and access errors never select another namespace            |
| Cache removal                           | Registration and rollout events invalidate the app across channels; unrelated apps remain cached                     |
| Event processing                        | Mixed, duplicate and reordered events, API failure/retry, missing configuration and malformed keys                   |
| HTTP contract                           | URI rewrite preserves request properties; response metadata, compression/cache headers and error status are retained |

The cache model completes invalidations explicitly to test requests before and after completion. It does not
claim to reproduce AWS propagation timing, event delivery, IAM policies, Lambda packaging or native runtime
compatibility. These remain separate environment checks before enabling production channel URLs.

For registration races, paginated legacy-tag collision checks and the actual Forge upload/promotion barrier, also run:

```sh
yarn workspace @granite-js/deployment-manager test
yarn workspace @granite-js/forge-cli test
```

## Cleaning up

To remove the deployed resources, use:

```bash
pulumi destroy
```

Review and confirm the destruction to remove all resources managed by your Pulumi stack.
