package run.granite.video

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import run.granite.video.provider.media3.Media3Initializer

/**
 * React Native package for GraniteVideo core functionality.
 *
 * This package provides the video view and module.
 * When USE_MEDIA3 is enabled (default), Media3 ExoPlayer is automatically
 * registered as the default video provider.
 *
 * To disable Media3 and use a custom provider:
 * ```
 * // In gradle.properties
 * graniteVideo.useMedia3=false
 * ```
 *
 * Then register your custom provider:
 * ```
 * GraniteVideoRegistry.registerFactory("custom") { MyCustomProvider() }
 * GraniteVideoRegistry.setDefaultProvider("custom")
 * ```
 */
class GraniteVideoPackage : ReactPackage {

    init {
        // Initialize Media3 provider when enabled
        if (BuildConfig.USE_MEDIA3) {
            Media3Initializer.initialize()
        }
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(GraniteVideoViewManager())
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(GraniteVideoModule(reactContext))
    }
}

