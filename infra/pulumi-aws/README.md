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

Existing URLs retain their meaning by default. To use a channel as the last path segment, register unused
selectors for each app in the CDN configuration:

```ts
new ReactNativeBundleCDN('cdn', {
  bucketName: 'sample-bucket',
  region: 'us-east-1',
  pathChannelRoutes: {
    'sample-app': ['next', 'stable'],
    shared: ['next', 'stable'],
  },
});
```

The native URL keeps the same path structure:

```text
/ios/sample-app/1/bundle   -> existing unscoped default bundle
/ios/sample-app/1/next     -> next channel's default bundle
/android/shared/1/next    -> next channel's shared bundle
```

`/ios/sample-app/1/next` reads `channels/next/deployments/sample-app/deployment_state` and serves
`channels/next/bundles/sample-app/<deploymentId>/bundle.ios.hbc.gz`.
Use a numeric group from 1 to 1000 for rollout targeting. Named clusters still require `allowAccessCluster`
in the handler; the component's default handler keeps cluster access disabled.

### Backward compatibility

- `pathChannelRoutes` defaults to an empty map. A deployment with `--channel` does not automatically register a URL.
- `bundle` is reserved for the existing unscoped default bundle and cannot be registered as a path channel.
- A suffix not registered for that app remains a legacy filename tag. Registering `next` for `sample-app` does
  not change how another app interprets its `next` tag.
- Once a suffix is registered, it always selects that channel. A missing channel deployment returns 404 without
  falling back to a legacy tagged/default bundle.
- Registration reserves an app/suffix pair. Only register names that the app has not used as legacy filename
  tags; the same URL cannot express both meanings. If a name is already used, keep its legacy route and choose
  another path-channel name. No storage-existence heuristic chooses between them.

Channel names follow the [Forge CLI rules](../forge-cli/README.md#deployment-channels). Invalid names, duplicate
registrations and `bundle` are rejected when configuring the handler. Register shared and app selectors separately
with matching channel names. Keep registrations in place while native releases depend on them.

### Cache behavior

Deployment channels use distinct path selectors and cache keys. File tags remain part of the unregistered
legacy URL contract. The S3 notification configuration watches both `deployments/` and `channels/`.
Because CloudFront supports wildcards only at the end of an invalidation path, invalidation covers the affected
app (or cluster) across all channels. Updating `channels/next/deployments/sample-app/deployment_state` invalidates:

```text
/ios/sample-app/*
/android/sample-app/*
```

This covers all path-channel selectors for the service. Other services are unaffected. Other channels of the
same app may incur a cache miss, but their deployment pointers and bundles stay unchanged. Deployment history
and immutable bundle uploads do not trigger invalidation. Pointer changes retain asynchronous S3-to-CloudFront
invalidation. See [AWS invalidation path rules](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html).

### Shared bundles and rollout order

The component's prebuilt shared bundle is bootstrapped only into the existing unscoped namespace. It is not
copied into named channels. Publish compatible shared and app bundles explicitly to each named channel before
enabling it in a native release. Channels do not validate runtime compatibility or make separate shared/app
publications atomic.

Update and verify the Lambda routing configuration and S3 notifications before enabling channel URLs in clients.
The old Lambda treats a trailing channel name as a filename tag. When adding or changing
route registrations, invalidate the affected app selectors and wait for completion before enabling clients, so
cached legacy responses cannot survive under the newly registered URLs.

Review the complete Pulumi preview: the existing component also manages shared-bundle objects and deployment
pointers, so applying infrastructure changes can publish or replace the unscoped shared deployment.

## Cleaning up

To remove the deployed resources, use:

```bash
pulumi destroy
```

Review and confirm the destruction to remove all resources managed by your Pulumi stack.
