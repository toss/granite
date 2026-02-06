package run.granite.lottie.builtin

import run.granite.lottie.GraniteLottieRegistry

/**
 * Initializes BuiltInLottieProvider as the default Lottie provider.
 * Called by BuiltInLottieContentProvider when USE_DEFAULT_PROVIDER is enabled.
 */
object BuiltInLottieInitializer {
    private var initialized = false

    /**
     * Initialize builtin provider and register it as default.
     * Safe to call multiple times - only executes once.
     */
    fun initialize() {
        if (initialized) return
        initialized = true

        GraniteLottieRegistry.registerFactory("builtin") { BuiltInLottieProvider() }
        GraniteLottieRegistry.setDefaultProvider("builtin")
    }
}