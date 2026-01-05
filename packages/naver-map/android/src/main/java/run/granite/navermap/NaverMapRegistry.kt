package run.granite.navermap

import android.content.Context

/**
 * Registry singleton for NaverMap providers
 *
 * Brownfield apps can register their own provider implementation at app startup.
 * If no provider is registered, the built-in NMapsMap provider will be used.
 *
 * Usage:
 * ```kotlin
 * // In your Application.onCreate() or before using NaverMap:
 * NaverMapRegistry.register(MyCustomNaverMapProvider())
 * ```
 */
object NaverMapRegistry {
    private var _provider: NaverMapProvider? = null

    /**
     * The currently registered provider
     */
    val provider: NaverMapProvider?
        get() = _provider

    /**
     * Register a custom provider. Call this at app startup before using NaverMap.
     */
    fun register(provider: NaverMapProvider) {
        _provider = provider
    }

    /**
     * Get the current provider, creating the built-in provider if none registered
     */
    fun getProvider(context: Context): NaverMapProvider {
        return _provider ?: BuiltInNaverMapProvider(context).also {
            _provider = it
        }
    }

    /**
     * Check if a custom provider has been registered
     */
    val hasCustomProvider: Boolean
        get() = _provider != null

    /**
     * Reset the provider (useful for testing)
     */
    fun reset() {
        _provider = null
    }
}
