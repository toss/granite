package run.granite.image

import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native Package that registers the GraniteImage component and GraniteImageModule.
 */
class GraniteImagePackage : ReactPackage {
    companion object {
        private const val TAG = "GraniteImagePackage"
        private var providerRegistered = false

        init {
            registerDefaultProvider()
        }

        private fun registerDefaultProvider() {
            if (providerRegistered) return

            // Try to auto-register a provider based on available implementations
            val providerClasses = listOf(
                "run.granite.image.providers.OkHttpImageProvider",
                "run.granite.image.providers.GlideImageProvider",
                "run.granite.image.providers.CoilImageProvider"
            )

            for (className in providerClasses) {
                try {
                    val clazz = Class.forName(className)
                    val provider = clazz.getDeclaredConstructor().newInstance() as GraniteImageProvider
                    GraniteImageRegistry.registerProvider(provider)
                    Log.d(TAG, "Auto-registered provider: $className")
                    providerRegistered = true
                    break
                } catch (e: ClassNotFoundException) {
                    // Provider not available, try next
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to instantiate provider $className: ${e.message}")
                }
            }

            if (!providerRegistered) {
                Log.w(TAG, "No image provider found. Make sure to include one of: okhttp, glide, or coil flavor.")
            }
        }
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(GraniteImageModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(GraniteImageManager())
    }
}
