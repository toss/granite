package run.granite.video

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import run.granite.video.provider.ExoPlayerProvider
import run.granite.video.provider.GraniteVideoRegistry

class GraniteVideoPackage : ReactPackage {

    init {
        // Auto-register default providers when package is loaded
        registerDefaultProviders()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(GraniteVideoViewManager())
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(GraniteVideoModule(reactContext))
    }

    companion object {
        private var providersRegistered = false

        /**
         * Register default providers based on build configuration.
         * This is called automatically when the package is loaded.
         *
         * To use a custom provider or change the default:
         * 1. Call GraniteVideoRegistry.registerFactory() with your provider
         * 2. Call GraniteVideoRegistry.setDefaultProvider() to set it as default
         *
         * Example in Application.onCreate():
         * ```
         * GraniteVideoRegistry.registerFactory("custom") { MyCustomProvider() }
         * GraniteVideoRegistry.setDefaultProvider("custom")
         * ```
         */
        @JvmStatic
        fun registerDefaultProviders() {
            if (providersRegistered) return
            providersRegistered = true

            // Register Media3 ExoPlayer as default (always available when default provider is included)
            if (BuildConfig.INCLUDE_DEFAULT_PROVIDER) {
                try {
                    GraniteVideoRegistry.registerFactory("media3") { ExoPlayerProvider() }

                    // Try to register ExoPlayer2 if available
                    tryRegisterExoPlayer2()

                    // Set Media3 as default if no default is set yet
                    if (GraniteVideoRegistry.getAvailableProviders().isNotEmpty()) {
                        GraniteVideoRegistry.setDefaultProvider("media3")
                    }
                } catch (e: Exception) {
                    // Provider registration failed, continue without it
                }
            }
        }

        private fun tryRegisterExoPlayer2() {
            try {
                // Check if ExoPlayer2 classes are available
                Class.forName("com.google.android.exoplayer2.ExoPlayer")

                // Dynamically load and register ExoPlayer2Provider
                val providerClass = Class.forName("run.granite.video.provider.exoplayer2.ExoPlayer2Provider")
                val constructor = providerClass.getDeclaredConstructor()

                GraniteVideoRegistry.registerFactory("exoplayer2") {
                    constructor.newInstance() as run.granite.video.provider.GraniteVideoProvider
                }
            } catch (e: ClassNotFoundException) {
                // ExoPlayer2 not available, skip registration
            } catch (e: Exception) {
                // Registration failed, continue without it
            }
        }

        /**
         * Manually trigger provider registration.
         * Useful for early initialization before React Native loads.
         */
        @JvmStatic
        fun ensureProvidersRegistered() {
            registerDefaultProviders()
        }
    }
}
