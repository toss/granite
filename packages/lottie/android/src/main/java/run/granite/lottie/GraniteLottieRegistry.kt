package run.granite.lottie

/**
 * Registry singleton for managing Lottie providers.
 * Supports both legacy single-provider API and new factory-based multi-provider pattern.
 */
object GraniteLottieRegistry {
    private val providers = mutableMapOf<String, () -> GraniteLottieProvider>()
    private var defaultProviderId: String? = null

    // Legacy support
    private var legacyProvider: GraniteLottieProvider? = null

    /**
     * Register a provider factory with an ID.
     * The factory will be invoked when createProvider(id) is called.
     */
    fun registerFactory(id: String, factory: () -> GraniteLottieProvider) {
        providers[id] = factory
    }

    /**
     * Create a provider instance by ID.
     */
    fun createProvider(id: String): GraniteLottieProvider? {
        return providers[id]?.invoke()
    }

    /**
     * Create a provider instance using the default selection logic:
     * 1. Default provider if set
     * 2. Legacy provider if registered
     * 3. First available factory
     */
    fun createProvider(): GraniteLottieProvider? {
        // 1. Default provider
        defaultProviderId?.let { id ->
            return providers[id]?.invoke()
        }
        // 2. Legacy provider
        legacyProvider?.let { return it }
        // 3. First available
        return providers.values.firstOrNull()?.invoke()
    }

    /**
     * Set the default provider ID to use when createProvider() is called.
     */
    fun setDefaultProvider(id: String) {
        defaultProviderId = id
    }

    /**
     * Check if any provider is available.
     */
    fun hasProvider(): Boolean {
        return providers.isNotEmpty() || legacyProvider != null
    }

    /**
     * Get list of registered provider IDs.
     */
    fun getAvailableProviders(): List<String> = providers.keys.toList()

    /**
     * Clear all registered providers. For testing purposes.
     */
    @androidx.annotation.VisibleForTesting
    fun clear() {
        providers.clear()
        defaultProviderId = null
        legacyProvider = null
    }

    // === Legacy API ===

    /**
     * Register a single provider instance (legacy API).
     * Prefer registerFactory() for new implementations.
     */
    fun register(provider: GraniteLottieProvider) {
        legacyProvider = provider
    }

    /**
     * Get the legacy registered provider.
     * Prefer createProvider() for new implementations.
     */
    val provider: GraniteLottieProvider?
        get() = legacyProvider

    /**
     * Legacy hasProvider property.
     */
    val hasProvider: Boolean
        get() = hasProvider()
}