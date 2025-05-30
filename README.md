# Granite &middot; [![Apache 2.0 License](https://img.shields.io/badge/license-Apache-blue.svg)](https://github.com/toss/slash/blob/main/LICENSE) [![NPM badge](https://img.shields.io/npm/v/@granite-js/react-native?logo=npm)](https://www.npmjs.com/package/@granite-js/react-native) [![codecov](https://codecov.io/gh/toss/granite/graph/badge.svg?token=LCP519I5BN)](https://codecov.io/gh/toss/granite)

Granite is an enterprise-grade React Native framework for microservice apps with brownfield integration, 200KB bundle sizes, and AWS-ready infrastructure.

- **Add React Native to existing apps** - Easily integrate React Native screens into your current iOS and Android apps.
- **Tiny bundles** - Create tiny 200KB microservice bundles with bundle splitting and smart optimization.
- **Fast builds** - Keep your JavaScript bundle build times down to just seconds using ESBuild.
- **Full AWS setup** - Complete infrastructure configuration with full deployment control.
- **One-click infrastructure** - Set up CDN and infrastructure with a single CLI command.
- **Simple defaults** - Pre-configured settings let you focus on building, not setup.
- **Comprehensive end-to-end testing** - Every feature comes with end-to-end tests included.
- **Fast native builds** - Keep your native build times quick with prebuilt frameworks. (WIP)

## Getting Started

Getting started with Granite is simple. First, create a new Granite app using our CLI:

```sh
npx create-granite-app@latest
```

Once you've written your React Native components, build your app with a single command:

```sh
npm run granite build
```

### Infrastructure Setup

Granite uses [Pulumi](https://www.pulumi.com/) to make infrastructure setup simple. With just a few lines of code using `@granite-js/pulumi-aws`, you can deploy your entire React Native infrastructure to AWS:

```typescript
import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { ReactNativeBundleCDN } from '@granite-js/pulumi-aws';

const config = new pulumi.Config();

new ReactNativeBundleCDN('myReactNativeBundleCDN', {
  bucketName: config.require('bucketName'),
  region: config.require('region'),
});
```

### Deploying Your App

Deploy your app to production with a single command. Our Forge handles the rest - uploading your bundle and getting it on your CDN.

```sh
npm run granite-forge deploy --bucket your-s3-bucket-name
```

For a simple, step-by-step guide, please visit our [getting started guide](https://granite.run/guides/quick-start/create-your-app.html). 

## Contributing

We welcome contribution from everyone in the community. Read below for detailed contribution guide.

[CONTRIBUTING](https://github.com/toss/granite/blob/main/.github/CONTRIBUTING.md)

## License

Apache 2.0 © Viva Republica, Inc. See [LICENSE](./LICENSE) for details.

<a title="Toss" href="https://toss.im">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://static.toss.im/logos/png/4x/logo-toss-reverse.png">
    <img alt="Toss" src="https://static.toss.im/logos/png/4x/logo-toss.png" width="100">
  </picture>
</a>
