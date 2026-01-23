package run.granite.video.provider.media3

import run.granite.video.BuildConfig
import run.granite.video.provider.GraniteVideoRegistry

/**
 * Initializes Media3 ExoPlayer as the default video provider.
 *
 * Called by GraniteVideoPackage when USE_MEDIA3 is enabled.
 */
object Media3Initializer {
    private var initialized = false

    /**
     * Initialize Media3 provider and register it as default.
     * Safe to call multiple times - only executes once.
     */
    fun initialize() {
        if (initialized) return
        initialized = true

        GraniteVideoRegistry.registerFactory("media3") { ExoPlayerProvider() }
        GraniteVideoRegistry.setDefaultProvider("media3")
    }
}
