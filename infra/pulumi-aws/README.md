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

### HTTP scenarios in AWS Lambda Node.js 22

The scenario suite interacts only through HTTP: publish a release, request a client URL, complete pending
notifications, inject an outage, retry, and verify HTTP status, bundle bytes and response headers.
Test cases do not import handlers, construct Lambda events, inspect S3 keys or assert mocked SDK calls.

```sh
docker pull --platform linux/amd64 public.ecr.aws/lambda/nodejs:22
yarn workspace @granite-js/deployment-manager build
yarn workspace @granite-js/pulumi-aws test:lambda:http
```

Docker must be running. The command builds the package and fails if Docker or the image is missing.
A dedicated `Lambda HTTP scenarios (Node 22)` CI job runs the same scenarios.

```text
HTTP publish control -> real Forge deploy operation -> local S3 HTTP service
Client URL GET -> HTTP gateway -> origin-request Lambda via RIE
              -> S3 bundle GET -> origin-response Lambda via RIE -> HTTP response
S3 notifications -> cache-removal Lambda via RIE -> CloudFront HTTP API -> cache invalidation
```

| Scenario                 | Observable result                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| First publication        | A cached 404 becomes the new channel bundle after successful publication and invalidation                |
| App/shared and platforms | iOS/Android receive their selected channel's bytes and deployment headers                                |
| Upgrade                  | Cached old bytes remain until invalidation completes; another app stays cached                           |
| Upload failure and retry | Either platform failing preserves the previous release; first-publication failure stays unavailable      |
| Canary and rollback      | Targeted clients receive the new release, baseline clients stay on the old one, and rollback restores it |
| Legacy compatibility     | Filename-tag URLs survive rejected channel collisions; queries cannot change channels                    |
| Storage failure          | Missing/corrupt/denied channel state returns an error without serving the legacy bundle                  |
| Invalidation outage      | Cached bytes persist during failure; a successful retry exposes the new release                          |

`/__test/*` endpoints are test-only controls for publication, registration, rollout, fault injection and event
completion. The publication control runs the actual Forge deploy operation in a child process, preserving its
upload and promotion behavior. The gateway adapts HTTP requests to CloudFront events; channel routing remains
inside the production Lambda artifacts. S3 and CloudFront are local HTTP services, with the actual bundled AWS
SDK handling their requests and responses. `x-test-cache` exposes only the local cache model's hit/miss state.

The harness uses the official Node.js 22 image on Amazon Linux 2023 / `linux/amd64`. It shares Pulumi's archive
source generator and checks each deployed `index.js` hash during setup. Containers use a non-root user,
read-only root, dummy credentials, no host mounts or published ports, and an internal Docker network without
external routing. The HTTP client runs inside that network; only HTTP responses return to Vitest. Containers,
networks, temporary images and files are removed after the suite.

Existing package-level regression tests remain available with `yarn workspace <package> test`. The HTTP gateway
models event delivery and cache completion; it is not a CloudFront emulator. IAM authorization, real edge/cache
behavior, delivery timing, resource limits and native bundle compatibility require separate environment checks.
No Lambda, infrastructure or app bundle deployment is needed for these tests.

## Cleaning up

To remove the deployed resources, use:

```bash
pulumi destroy
```

Review and confirm the destruction to remove all resources managed by your Pulumi stack.
