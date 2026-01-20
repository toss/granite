package run.granite.video.media3

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import run.granite.video.provider.media3.Media3Initializer

/**
 * React Native package for Media3 video provider.
 * 
 * This package is autolinked and triggers Media3 provider registration.
 * Registration can be disabled via gradle.properties:
 * 
 * ```
 * graniteVideo.useMedia3=false
 * ```
 */
class GraniteVideoMedia3Package : ReactPackage {

    init {
        // Trigger Media3 initialization when package is loaded
        Media3Initializer.ensureInitialized()
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
