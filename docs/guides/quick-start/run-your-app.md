# Running Your App

Once you've deployed your app with `granite-forge` and have the bundle address, you can run it directly in the sandbox app. Follow the steps below to set it up easily.

If you don't have the sandbox app yet, please check the [Install Sandbox App](/ko/guides/quick-start/install-native-app) document first.

## 1. Check Required Information

Check the `scheme` and `appName` values required for running the app in the `granite.config.ts` file.

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

## 2. Enter Settings in Sandbox App

Open the sandbox app and enter the following information.

- **Host**: `https://<cloudfront-cdn>`  
  This is the CDN (Content Delivery Network) address where your app bundle is hosted.
- **URL Scheme**: `<scheme>://<appName>`  
  Example: `granite://showcase`

Once you save these settings, you can run the app in the sandbox environment.

## 3. App Execution and Bundle File Address Structure

When you run the app, it loads bundle files based on the specified scheme. For example, if you use the `granite://example` scheme, it fetches bundle files from addresses with the following structure.

`1-1000` is a group identifier automatically assigned by the native app. This number is used when delivering different bundles to different user groups, similar to Canary deployments.

- **iOS**

  - Shared bundle: `https://<cloudfront-cdn>/ios/shared/1-1000/bundle`
  - App-specific bundle: `https://<cloudfront-cdn>/ios/example/1-1000/bundle`

- **Android**
  - Shared bundle: `https://<cloudfront-cdn>/android/shared/1-1000/bundle`
  - App-specific bundle: `https://<cloudfront-cdn>/android/example/1-1000/bundle`

## Example Videos

| iOS                                                                                                                                                                                                             | Android                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/ios_showcase.mp4" type="video/mp4" /> Your browser does not support the video tag. </video> | <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/android_showcase.mov" type="video/mp4" /> Your browser does not support the video tag. </video> |
