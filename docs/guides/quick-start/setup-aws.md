# Setting up Infrastructure on AWS

This guide explains how to set up a **React Native CDN (Content Delivery Network)** infrastructure on AWS using **Pulumi**. This process is done using the `@granite-js/pulumi-aws` package.

## Installation

If you're using Pulumi for the first time, you'll need to install the Pulumi CLI first. Please refer to the official guide below to install it according to your operating system.

- [Pulumi Installation Guide](https://www.pulumi.com/docs/iac/download-install/)

## Creating a Pulumi Project

To create a Pulumi project, run the following command

When you run this command, a default template will be created and you'll be prompted for some settings. After entering the project name, description, AWS region, etc., your project will be ready.

```bash
mkdir react-native-cdn
cd react-native-cdn
pulumi new aws-typescript
```

## Installing Packages

To use the React Native CDN component in Pulumi, you need to install the `@granite-js/pulumi-aws` package. Run one of the following commands based on your package manager

::: code-group

```sh [npm]
npm install @granite-js/pulumi-aws --save-dev
```

```sh [pnpm]
yarn add @granite-js/pulumi-aws --dev
```

```sh [yarn]
pnpm add @granite-js/pulumi-aws --save-dev
```

:::

## Configuring AWS Credentials

You need to set up credentials so that Pulumi can create AWS resources. You can do this either through environment variables or using the AWS CLI.

### Method 1: Setting up with Environment Variables

Pulumi reads AWS credentials from the environment to create resources. By setting credentials as environment variables, Pulumi can automatically read the values without requiring a separate configuration file.

Set the credentials in your terminal as follows. This method is temporary and will be lost when you close the terminal.

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="your-region"
```

### Method 2: Setting up with AWS CLI

When you run this command, you can enter your credentials and default region. Setting up credentials with AWS CLI ensures they persist even after closing the terminal.

```bash
aws configure
```

## Usage

To use the `ReactNativeBundleCDN` component, import it in your Pulumi program and create an instance

```ts
import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { ReactNativeBundleCDN } from '@granite-js/pulumi-aws';

const config = new pulumi.Config();

new ReactNativeBundleCDN('myReactNativeBundleCDN', {
  bucketName: config.require('bucketName'),
  region: config.require('region'),
});
```

## Setting Configuration Variables

The configuration variables `bucketName` and `region` used in the example code above need to be specified in Pulumi configuration beforehand

```bash
pulumi config set bucketName your-bucket-name
pulumi config set region us-west-2
```

## Deploying Infrastructure

Once all settings are complete, deploy the infrastructure using the following command

```bash
pulumi up
```

::: warning When using Yarn Plug'n'Play (PnP)
You need to install pnpify and run the pulumi command as follows:
```bash
yarn add @yarnpkg/pnpify -D
yarn pnpify pulumi up
```
:::


When you run this command, Pulumi will show you what resources it will create. After reviewing the changes, enter `yes` to start the deployment. This process will create the React Native CDN infrastructure on AWS.

## Cleaning up Resources

To delete the deployed resources when they are no longer needed, run the following command

```bash
pulumi destroy
```

Pulumi will show you what resources it will delete and ask for confirmation. Enter `yes` to delete all resources.
