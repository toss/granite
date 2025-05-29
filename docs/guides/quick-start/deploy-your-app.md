# Deploy Your App

This guide explains how to create a Granite application using `granite-app` and deploy service bundles to AWS using the `granite-forge` deployment tool. By following this process, you can deploy and run your application on an Amazon S3 bucket.

## Prerequisites

To deploy your application to AWS, you need to meet the following conditions:

- You must have an AWS account.
- You need to have an access key and secret key with `AmazonS3FullAccess` permissions issued from IAM.
- An S3 bucket created via Pulumi must be ready.

## 1. Creating a Granite Application

First, create a new Granite application. Open your terminal and run one of the following commands based on your package manager:

::: code-group

```sh [npm]
npx create-granite-app@latest
cd my-granite-app
```

```sh [pnpm]
pnpm create granite-app
cd my-granite-app
```

```sh [yarn]
yarn create granite-app
cd my-granite-app
```

:::

This command creates a new directory named `my-granite-app` and generates the basic structure of a Granite application within it.

## 2. Installing Deployment Tools and Configuring Environment

Navigate to the created application directory, install the necessary dependencies, and set up environment variables for AWS deployment.

### Installing Dependencies

`granite-forge` is the tool for deploying Granite applications.

::: code-group

```sh [npm]
npm install @granite-js/forge-cli --save-dev
```

```sh [pnpm]
pnpm add @granite-js/forge-cli --save-dev
```

```sh [yarn]
yarn add @granite-js/forge-cli --dev
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

## 3. Building and Deploying the Application

Once the environment variables are set, use the following commands to build and deploy your Granite application.

### Building the Application

This command compiles and optimizes the application source code into a deployable format.

::: code-group

```sh [npm]
npx granite build
```

```sh [pnpm]
pnpm granite build
```

```sh [yarn]
yarn granite build
```

:::

### Deploying the Service Bundle

This command uploads the built service bundle to the specified S3 bucket and provisions the necessary AWS resources to deploy the application. You must specify the correct S3 bucket name for deployment using the `--bucket` option.

::: code-group

```sh [npm]
npx granite-forge deploy --bucket your-s3-bucket-name
```

```sh [pnpm]
pnpm granite-forge deploy --bucket your-s3-bucket-name
```

```sh [yarn]
yarn granite-forge deploy --bucket your-s3-bucket-name
```

:::

## Next Steps

Once the application is successfully deployed, you can use the following endpoint addresses to access the service on each platform.
`1-1000` should be replaced with a number between `1` and `1000`. This number is used for canary deployments.

The endpoint addresses are as follows:
- iOS: `https://<cloudfront-cdn>/ios/<appName>/1-1000/bundle`
- Android: `https://<cloudfront-cdn>/android/<appName>/1-1000/bundle`
