package run.granite.lottie

/**
 * Registry singleton for managing the Lottie provider.
 * Call register() in your Application class to set up the provider.
 */
object GraniteLottieRegistry {
    /**
     * The current registered provider
     */
    var provider: GraniteLottieProvider? = null
        private set

    /**
     * Register a provider implementation.
     * Call this in your Application.onCreate() method.
     *
     * @param provider The provider implementation to use
     */
    fun register(provider: GraniteLottieProvider) {
        this.provider = provider
    }

    /**
     * Check if a provider is registered
     */
    val hasProvider: Boolean
        get() = provider != null
}
