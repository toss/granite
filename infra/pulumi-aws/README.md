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

The origin-request Lambda supports both URL formats on the same distribution:

```text
/<platform>/<app>/<group>/<suffix>
/channels/<channel>/<platform>/<app>/<group>/<suffix>
```

For example, `/channels/preview/ios/sample-app/1/bundle` reads
`channels/preview/deployments/sample-app/deployment_state` and serves
`channels/preview/bundles/sample-app/<deploymentId>/bundle.ios.hbc.gz`.
Use `android` for Android, a numeric group from 1 to 1000 for rollout targeting, and `bundle` for the default
filename. Other suffixes select filename tags. Named clusters still require `allowAccessCluster` in the handler;
the component's default handler keeps cluster access disabled.

Channel names follow the [Forge CLI rules](../forge-cli/README.md#deployment-channels). An invalid channel route
returns 400. A missing deployment returns 404 without looking in another channel or the unscoped namespace.
The request URI includes the channel, so each channel has a separate CloudFront cache key.

The S3 notification configuration watches both `deployments/` and `channels/`. The cache-removal Lambda scopes
invalidation to the affected channel and app (or cluster). Updating
`channels/preview/deployments/sample-app/deployment_state` invalidates only:

```text
/channels/preview/ios/sample-app/*
/channels/preview/android/sample-app/*
```

Deployment history and immutable bundle uploads do not trigger invalidation. Existing unscoped invalidation
paths remain unchanged. Pointer changes retain the existing asynchronous S3-to-CloudFront invalidation behavior.

### Shared bundles and rollout order

The component's prebuilt shared bundle is bootstrapped only into the existing unscoped namespace. It is **not**
copied into named channels. Publish a compatible shared bundle and app bundles explicitly to each named channel
before enabling that channel in a native release. Channel isolation does not validate runtime compatibility or
make separately published shared/app bundles an atomic pair.

Update the infrastructure's Lambda code and S3 notifications before releasing clients that use channel URLs.
Review the complete Pulumi preview: the existing component also manages shared-bundle objects and deployment
pointers, so applying infrastructure changes can publish or replace the unscoped shared deployment.

## Cleaning up

To remove the deployed resources, use:

```bash
pulumi destroy
```

Review and confirm the destruction to remove all resources managed by your Pulumi stack.
