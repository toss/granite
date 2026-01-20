# GraniteVideo Media3

Video provider implementation based on Media3 ExoPlayer.

## Installation

```gradle
// app/build.gradle
dependencies {
    implementation project(':granite-video')        // Core (required)
    implementation project(':granite-video-media3') // Media3 Provider
}
```

## Usage

Add `GraniteVideoMedia3Package` to your React Native package list to automatically register the Media3 provider:

```kotlin
// MainApplication.kt
packages.add(GraniteVideoMedia3Package())
```

## Disable Registration

You can disable provider registration via `gradle.properties`:

```properties
graniteVideo.useMedia3=false
```

When disabled, the Media3 module is included in the build but the provider is not registered.

## Supported Formats

- HLS (.m3u8)
- DASH (.mpd)
- Smooth Streaming
- Progressive (MP4, WebM, etc.)

## DRM Support

- Widevine
- PlayReady
- ClearKey
