package run.granite.video.provider.media3

import run.granite.video.media3.BuildConfig
import run.granite.video.provider.GraniteVideoRegistry

/**
 * Initializes Media3 ExoPlayer as the default video provider.
 * 
 * Registration is controlled by gradle.properties flag:
 * - graniteVideo.useMedia3=true (default): Registers ExoPlayerProvider
 * - graniteVideo.useMedia3=false: Skips registration
 */
object Media3Initializer {
    private var initialized = false

    init {
        initialize()
    }

    private fun initialize() {
        if (initialized) return
        initialized = true

        if (BuildConfig.USE_MEDIA3) {
            GraniteVideoRegistry.registerFactory("media3") { ExoPlayerProvider() }
            GraniteVideoRegistry.setDefaultProvider("media3")
        }
    }

    /**
     * Ensures the initializer has run.
     * Called by GraniteVideoMedia3Package to trigger the init block.
     */
    fun ensureInitialized() {
        // No-op - init block does the work
    }
}
