# GraniteVideo Android

Android native module for React Native video player library.

## Module Structure

```
packages/video/
├── android/           → granite-video (Core)
└── android-media3/    → granite-video-media3 (Media3 ExoPlayer implementation)
```

- **granite-video**: Video player interface, registry, React Native view
- **granite-video-media3**: Default implementation based on Media3 ExoPlayer

---

## Basic Usage

### 1. Add Dependencies

```gradle
// app/build.gradle
dependencies {
    implementation project(':granite-video')
    implementation project(':granite-video-media3')  // Media3 ExoPlayer
}
```

### 2. Register React Native Packages

```kotlin
// MainApplication.kt
import run.granite.video.GraniteVideoPackage
import run.granite.video.media3.GraniteVideoMedia3Package

override fun getPackages(): List<ReactPackage> {
    val packages = PackageList(this).packages.toMutableList()
    packages.add(GraniteVideoPackage())
    packages.add(GraniteVideoMedia3Package())  // Auto-registers Media3 provider
    return packages
}
```

---

## Media3 Provider (Default)

Media3 ExoPlayer is the default video provider and is enabled by default.

### Disabling Media3

To disable Media3 and use a custom provider, you can use either:

**Option 1: gradle.properties**

```properties
graniteVideo.useMedia3=false
```

**Option 2: Environment variable** (takes priority)

```bash
export GRANITE_VIDEO_USE_MEDIA3=false
```

Priority: Environment variable > gradle.properties > default (true)

### Custom Provider Registration

When Media3 is disabled, register your custom provider in your Application class:

```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        GraniteVideoRegistry.registerFactory("custom") { MyCustomProvider() }
        GraniteVideoRegistry.setDefaultProvider("custom")
    }
}
```

---

## Custom Provider Implementation

To use a different player (VLC, ijkplayer, etc.) instead of Media3, implement a custom provider.

### 1. Implement GraniteVideoProvider Interface

```kotlin
package com.example.video

import android.content.Context
import android.view.View
import run.granite.video.provider.*

class MyCustomProvider : GraniteVideoProvider {

    // Required: Provider identification
    override val providerId: String = "custom"
    override val providerName: String = "My Custom Player"

    // Required: Delegate (event callbacks)
    override var delegate: GraniteVideoDelegate? = null

    // Required: State properties
    override val currentTime: Double get() = /* current playback position */
    override val duration: Double get() = /* total duration */
    override val isPlaying: Boolean get() = /* is playing */

    // Required: Create player view
    override fun createPlayerView(context: Context): View {
        // Return player view (e.g., SurfaceView, TextureView)
        return MyPlayerView(context)
    }

    // Required: Load source
    override fun loadSource(source: GraniteVideoSource) {
        val uri = source.uri ?: return
        // Load media from URI
        // Handle source.headers, source.drm, etc.

        // Fire load start event
        delegate?.onLoadStart(
            isNetwork = uri.startsWith("http"),
            type = source.type ?: "unknown",
            uri = uri
        )
    }

    override fun unload() {
        // Release resources
    }

    // Required: Playback control
    override fun play() {
        // Start playback
        delegate?.onPlaybackStateChanged(isPlaying = true, isSeeking = false, isLooping = false)
    }

    override fun pause() {
        // Pause playback
        delegate?.onPlaybackStateChanged(isPlaying = false, isSeeking = false, isLooping = false)
    }

    override fun seek(time: Double, tolerance: Double) {
        val previousTime = currentTime
        // Seek to position
        delegate?.onSeek(currentTime = previousTime, seekTime = time)
    }

    // Optional: Volume, rate, repeat, etc.
    override fun setVolume(volume: Float) { /* ... */ }
    override fun setRate(rate: Float) { /* ... */ }
    override fun setRepeat(shouldRepeat: Boolean) { /* ... */ }

    // Optional: Release resources
    fun release() {
        unload()
        delegate = null
    }
}
```

### 2. Create Provider Initialization Package

```kotlin
package com.example.video

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import run.granite.video.provider.GraniteVideoRegistry

class MyCustomVideoPackage : ReactPackage {

    init {
        // Register provider when package is instantiated
        GraniteVideoRegistry.registerFactory("custom") { MyCustomProvider() }
        GraniteVideoRegistry.setDefaultProvider("custom")
    }

    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> = emptyList()
    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
```

### 3. Register Package in MainApplication

```kotlin
// MainApplication.kt
import run.granite.video.GraniteVideoPackage
import com.example.video.MyCustomVideoPackage

override fun getPackages(): List<ReactPackage> {
    val packages = PackageList(this).packages.toMutableList()

    // Core Package (required)
    packages.add(GraniteVideoPackage())

    // Custom Provider Package (instead of Media3Package)
    packages.add(MyCustomVideoPackage())

    return packages
}
```

---

## Provider Event Callbacks

Providers communicate events via `delegate`:

| Method                                                    | Description                                |
| --------------------------------------------------------- | ------------------------------------------ |
| `onLoadStart(isNetwork, type, uri)`                       | Source load started                        |
| `onLoad(data)`                                            | Load complete (duration, dimensions, etc.) |
| `onProgress(data)`                                        | Playback progress                          |
| `onError(error)`                                          | Error occurred                             |
| `onEnd()`                                                 | Playback ended                             |
| `onBuffer(isBuffering)`                                   | Buffering state changed                    |
| `onPlaybackStateChanged(isPlaying, isSeeking, isLooping)` | Playback state changed                     |
| `onSeek(currentTime, seekTime)`                           | Seek completed                             |

---

## License

Apache License 2.0
