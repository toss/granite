# Setting Up AWS Infrastructure for Granite

Set up an on-premise React Native CDN infrastructure on AWS in 15 minutes.

## What You'll Build

By the end of this guide, you'll have:
- S3 Bucket for storing your app bundles
- CloudFront CDN for fast global delivery
- Production-ready infrastructure that scales with your users

## Prerequisites

Before you start, make sure you have:

- **AWS Account** - [Sign up here](https://aws.amazon.com/)

## 1. Install Pulumi CLI

First, install Pulumi - a tool that helps you set up AWS infrastructure using code. Choose your operating system below:

::: code-group

```sh [macOS]
brew install pulumi
```

```sh [Windows]
winget install pulumi
```

```sh [Linux]
curl -fsSL https://get.pulumi.com | sh
```

:::

For detailed installation steps, check out the [Pulumi installation guide](https://www.pulumi.com/docs/iac/download-install/).

> **✅ Success indicator:** Run `pulumi version` - you should see version info

## 2. Set Up AWS Credentials

You need to tell Pulumi how to access your AWS account. Choose one method:

### Option A: Using AWS CLI (Recommended)

Install AWS CLI and configure it:

```bash
# Install AWS CLI
# macOS: brew install awscli
# Windows: winget install Amazon.AWSCLI
# Linux: apt install awscli

# Configure your credentials
aws configure
```

Enter your credentials when prompted:
```
AWS Access Key ID: [Your access key]
AWS Secret Access Key: [Your secret key]  
Default region: [Your region]
Default output format: json
```

### Option B: Using Environment Variables

For temporary setup, set these in your terminal:

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="your-region"
```

::: info Where to get AWS credentials

Go to AWS Console → IAM → Users → Your User → Security Credentials → Create Access Key.

:::

## 3. Create Your Infrastructure Project

Create a new directory for your AWS infrastructure:

```bash
mkdir my-granite-infrastructure
cd my-granite-infrastructure
```

Initialize a new Pulumi project:

```bash
pulumi new aws-typescript
```

You'll see an interactive setup:

```
This command will walk you through creating a new Pulumi project.

Enter a value or leave blank to accept the (default), and press <ENTER>.
Press ^C at any time to quit.

Project name: my-granite-infrastructure
Project description: Granite app CDN infrastructure
Created project 'my-granite-infrastructure'

stack name: dev
Created stack 'dev'

The package manager to use for installing dependencies: {Your package manager}
The AWS region to deploy into (aws:region): {Your AWS region}
Saved config
```

> **✅ Success indicator:** You see "Your new project is ready to go!" message

## 4. Install Granite Infrastructure Package

Add the Granite infrastructure components:

::: code-group

```sh [npm]
npm install @granite-js/pulumi-aws --save-dev
```

```sh [pnpm]
pnpm add @granite-js/pulumi-aws --save-dev
```

```sh [yarn]
yarn add @granite-js/pulumi-aws --dev
```

:::

## 5. Configure Your Infrastructure

Replace the contents of `index.ts` with:

```typescript
import * as pulumi from '@pulumi/pulumi';
import { ReactNativeBundleCDN } from '@granite-js/pulumi-aws';

const config = new pulumi.Config();

// Create your Granite CDN infrastructure
const cdn = new ReactNativeBundleCDN('granite-cdn', {
  bucketName: config.require('bucketName'),
  region: config.require('region'),
});

export const cdnUrl = cdn.cloudfrontDomain;
export const bucketName = cdn.bucketName;
```

## 6. Set Configuration Values

Configure your bucket name and region:

```bash
# Set your unique bucket name (must be globally unique)
pulumi config set bucketName {your-bucket-name}

# Set your AWS region
pulumi config set region {your-region}
```

::: info 

Bucket names must be globally unique. 

:::

## 7. Deploy Your Infrastructure  

Let's proceed with creating your AWS infrastructure:

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

Pulumi will show you what it's going to create:

```
Previewing update (dev)

View Live: https://app.pulumi.com/yourname/my-granite-infrastructure/dev/previews/...

     Type                              Name                              Plan       
 +   pulumi:pulumi:Stack               my-granite-infrastructure-dev     create     
 +   └─ {The infrastructure to create}   

Resources:
    + * to create

Do you want to perform this update? yes
```

Type `yes` and press Enter. Pulumi will create your infrastructure:

```
Updating (dev)

View Live: https://app.pulumi.com/yourname/my-granite-infrastructure/dev/updates/1

     Type                              Name                              Status      
 +   pulumi:pulumi:Stack               my-granite-infrastructure-dev     created     
 +   └─ {The infrastructure to create}     

Resources:
    + * created

Duration: {duration}
```

> **✅ Success indicator:** You see "Resources: + * created" and your CDN URL

## 🎉 Congratulations!

You've successfully created your Granite infrastructure in AWS! Here's what you now have:

- On-premise AWS infrastructure
- Global CDN for fast app loading worldwide
- Scalable architecture that grows with your users
- Full control over your deployment pipeline

## Clean Up (Optional)

To delete the deployed resources when they are no longer needed, run the following command:

```bash
pulumi destroy
```

Pulumi will show you what resources it will delete and ask for confirmation. Enter `yes` to delete all resources.

## What's Next?

Now that your infrastructure is set up:

- [Deploy Your App](./deploy-your-app) - Learn how to deploy your Granite app to your AWS infrastructure
