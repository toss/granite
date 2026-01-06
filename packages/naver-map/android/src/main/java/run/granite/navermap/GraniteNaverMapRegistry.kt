package run.granite.navermap

import android.content.Context

/**
 * Registry singleton for NaverMap providers
 *
 * Brownfield apps can register their own provider implementation at app startup.
 * If no provider is registered and the default provider is included, the built-in
 * NMapsMap provider will be used.
 *
 * Usage:
 * ```kotlin
 * // In your Application.onCreate() or before using NaverMap:
 * GraniteNaverMapRegistry.register(MyCustomGraniteNaverMapProvider())
 * ```
 */
object GraniteNaverMapRegistry {
    private var _provider: GraniteNaverMapProvider? = null

    /**
     * The currently registered provider
     */
    val provider: GraniteNaverMapProvider?
        get() = _provider

    /**
     * Register a custom provider. Call this at app startup before using NaverMap.
     */
    fun register(provider: GraniteNaverMapProvider) {
        _provider = provider
    }

    /**
     * Get the current provider, creating the built-in provider if none registered
     * and the default provider is available.
     *
     * @return The provider, or null if no provider is registered and default provider is not included
     */
    fun getProvider(context: Context): GraniteNaverMapProvider? {
        if (_provider != null) {
            return _provider
        }

        // Only try to create built-in provider if it's included in the build
        if (BuildConfig.INCLUDE_DEFAULT_PROVIDER) {
            return createBuiltInProvider(context)?.also {
                _provider = it
            }
        }

        return null
    }

    /**
     * Create built-in provider using reflection to avoid compile-time dependency
     */
    private fun createBuiltInProvider(context: Context): GraniteNaverMapProvider? {
        return try {
            val clazz = Class.forName("run.granite.navermap.builtinProvider.BuiltInGraniteNaverMapProvider")
            val constructor = clazz.getConstructor(Context::class.java)
            constructor.newInstance(context) as GraniteNaverMapProvider
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Check if a custom provider has been registered
     */
    val hasCustomProvider: Boolean
        get() = _provider != null

    /**
     * Check if the default provider is available in this build
     */
    val hasDefaultProvider: Boolean
        get() = BuildConfig.INCLUDE_DEFAULT_PROVIDER

    /**
     * Reset the provider (useful for testing)
     */
    fun reset() {
        _provider = null
    }
}
