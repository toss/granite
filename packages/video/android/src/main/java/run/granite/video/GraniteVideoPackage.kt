package run.granite.video

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native package for GraniteVideo core functionality.
 *
 * This package provides the video view and module.
 * Video provider registration is handled automatically via ContentProvider
 * when USE_MEDIA3 is enabled (default).
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

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(GraniteVideoViewManager())
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(GraniteVideoModule(reactContext))
    }
}

