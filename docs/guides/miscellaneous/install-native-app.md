# Installing Test App

The Granite test App is an application for testing deployed bundles. This document guides you through installing and setting up the Granite test App on iOS simulators and Android devices.

## <span style="display:inline-flex; align-items:center; gap:5px;"><img src="/icons/apple.svg" alt="Apple iOS" width="24" height="24" style="margin-top:-4px"> iOS Simulator Installation Guide </span>

To test React Native apps on iOS, you need a simulator. The simulator comes with `Xcode` when installed on macOS.

Follow the guide below to install the app.

### Prerequisites

- macOS
- Xcode (Available on the App Store)

### Installation Steps

1. Download the Granite iOS app bundle from GitHub Releases  
   **[Browse all releases](https://github.com/toss/granite/releases)**

   - To use a stable version, choose a release without the "Pre-release" badge or version names like `alpha`, `beta`, or `rc`.
   - To try the latest features, you can use a pre-release version.
   - In the Assets section, download the `granite_ios.zip` file.

2. Extract the downloaded `granite_ios.zip` file.

3. Drag the `.app` file into the `Xcode` iOS simulator window to install.  
   The app will be copied to the simulator when you drag and drop.

## <span style="display:inline-flex; align-items:center; gap:5px;"><img src="/icons/android.svg" alt="Android" width="24" height="24" style="margin-top:-2px"> Android Installation Guide </span>

### Prerequisites

- Android device or emulator
- ADB (Android Debug Bridge) installation (Comes with Android Studio)

### Installation Steps

1. Download the Granite Android APK from GitHub Releases  
   **[Browse all releases](https://github.com/toss/granite/releases)**

   - To use a stable version, choose a release without the "Pre-release" badge or version names like `alpha`, `beta`, or `rc`.
   - To try the latest features, you can use a pre-release version.
   - In the Assets section, download the `granite_android.zip` file.

2. Extract the downloaded `granite_android.zip` file.

3. Choose one of the installation methods.

#### Install using ADB command

- Connect your Android device to your computer, then run the following command in the terminal:
  ```bash
  adb install granite_android.apk
  ```

#### Direct installation on device

1. Copy the downloaded APK file to your Android device.
2. Open the file explorer on your device and tap the APK file to install.  
   You may need to enable 'Install from Unknown Sources' in security settings.

## Initial Setup

When you first run the app, you need to enter the CDN address for loading bundles and the deep link scheme. Granite provides values that you can use for testing.

| Setting Item   | Value                                   | Description                                     |
| -------------- | --------------------------------------- | ----------------------------------------------- |
| **Host**       | `https://d2dzky5bdhec40.cloudfront.net` | Trial bundle CDN address. Provided for testing. |
| **URL Scheme** | `granite://showcase` <br> `granite://counter`  | Scheme used for handling deep links in the app. |

Enter these values in the Granite test settings and run the app.

| iOS                                                                                                                                                                                                             | Android                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/ios_showcase.mp4" type="video/mp4" /> Your browser does not support the video tag. </video> | <video autoplay loop muted style="max-width:400px; width:100%; height:auto; margin-top:1rem;"> <source src="/videos/android_showcase.mov" type="video/mp4" /> Your browser does not support the video tag. </video> |
