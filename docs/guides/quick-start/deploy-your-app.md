# Deploy & Run Your Granite App

Get your app live on AWS in 5 minutes.

## What Happens When You Deploy

- Upload optimized bundles to your AWS S3 bucket
- Distribute globally via CloudFront CDN
- Update apps instantly

> **⏱️ Estimated time:** 5 minutes

> **📱 Result:** Your app running live from AWS CDN

## Prerequisites

Make sure you've completed these guides first:

- **[Getting Started](./create-your-app)** - Your Granite app is built and working
- **[Setting Up AWS Infrastructure](./setup-aws)** - Your AWS CDN is set up and running

## 1. Build Your Production App

First, let's build your [Granite app](./create-your-app) for production. Run this command in your project directory:

::: code-group

```sh [npm]
npm run build
```

```sh [pnpm]
pnpm run build
```

```sh [yarn]
yarn build
```

:::

Granite will create optimized microservice bundles, and your optimized bundles are now in the `dist/` directory:

<img src="../../public/getting-started/bundle-size.png" style="margin: 0 auto; max-width: 500px; width: 100%;" />

> **✅ Success indicator:** You see built bundles, with sizes under 300KB each

## 2. Install Granite Forge CLI

Next, install the Granite Forge CLI - this tool helps you deploy your bundles to AWS:

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

## 3. Deploy Your App

With the S3 bucket set up from the [AWS infrastructure guide](./setup-aws), let's deploy your app.

::: code-group

```sh [npm]
npx granite-forge deploy --bucket {Your S3 Bucket Name}
```

```sh [pnpm]
pnpm granite-forge deploy --bucket {Your S3 Bucket Name}
```

```sh [yarn]
yarn granite-forge deploy --bucket {Your S3 Bucket Name}
```

:::

You'll see the deployment progress:

```
$ npx granite-forge deploy --bucket {Your bucket name}
┌  Start deployment
│
◇  Successfully fetched current deployment state
│
▲  No deployment state found
│
◇  Are you sure you want to deploy test-granite-app?
│  Yes
│
◇  Bundle uploaded
│
◇  Bundle list updated
│
◇  Deployed successfully! (Deployment ID: **********************)
│
└  Done
```

> **✅ Success indicator:** You see "Done"

## 4. Test Your Granite App

Now that your app is deployed, let's test it out using the Granite test app.

Open the [Granite test app](../miscellaneous/install-native-app) on your simulator and enter the following information:

| Field      | What to Enter                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host       | The CDN URL from your [AWS infrastructure deployment](../quick-start/setup-aws.html#_7-deploy-your-infrastructure) (you can check it in the output of the infrastructure deployment) |
| URL Scheme | Your app's URL scheme in the format: `{your-scheme}://{your-app-name}` (these values come from your Granite config)                                                                  |

::: details Finding your scheme and app name

These values are defined in your `granite.config.ts` file. Let's take a look at how to find them:

```ts
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  // Example execution scheme: granite://showcase
  scheme: 'granite',
  appName: 'showcase',
  plugins: [
    // ...
  ],
});
```

:::

<img src="../../public/getting-started/input-cdn-url.png" style="max-width: 320px; margin: 0 auto; width: 100%;" />

Click Submit and watch your app load instantly from your AWS infrastructure! Your app is now being served through a global CDN, ready for users worldwide. 🌍

## Example Videos

| iOS                                                                                                                                                                                                             | Android                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/ios_showcase.mp4" type="video/mp4" /> Your browser does not support the video tag. </video> | <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/android_showcase.mov" type="video/mp4" /> Your browser does not support the video tag. </video> |

## Understanding Deployment URLs

Your app is deployed to specific URLs based on platform and version:

### URL Structure

```
https://<your-cdn>/[platform]/[appName]/[version]/bundle
```

### Example URLs

```bash
# iOS bundles
https://d1234567890123.cloudfront.net/ios/my-granite-app/100/bundle

# Android bundles
https://d1234567890123.cloudfront.net/android/my-granite-app/100/bundle
```

### Version Numbers (1-1000)

Version numbers control what percentage of users get your app update, from 0% to 100% of your user base, with 0.1% granularity.

## 🎉 Congratulations!

Your Granite app is now live on AWS! Here's what you can do now:

- **Update instantly** - Deploy new versions by single CLI command
- **Global performance** - Your app loads worldwide via CDN
