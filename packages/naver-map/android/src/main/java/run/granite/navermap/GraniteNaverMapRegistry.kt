package run.granite.navermap

import android.content.Context

/**
 * Type alias for provider creation lambda
 */
typealias GraniteNaverMapProviderCreator = (Context) -> GraniteNaverMapProvider

/**
 * Internal wrapper to adapt lambda to factory interface
 */
private class LambdaProviderFactory(
    private val creator: GraniteNaverMapProviderCreator
) : GraniteNaverMapProviderFactory {
    override fun createProvider(context: Context): GraniteNaverMapProvider {
        return creator(context)
    }
}

/**
 * Registry singleton for NaverMap provider factories
 *
 * Brownfield apps can register their own provider factory at app startup.
 * If no factory is registered and the default provider is included, the built-in
 * NMapsMap provider factory will be used.
 *
 * Usage:
 * ```kotlin
 * // In your Application.onCreate() or before using NaverMap:
 * GraniteNaverMapRegistry.register { context ->
 *     MyNaverMapProvider(context)
 * }
 * ```
 */
object GraniteNaverMapRegistry {
    private var _factory: GraniteNaverMapProviderFactory? = null

    /**
     * The currently registered factory
     */
    val factory: GraniteNaverMapProviderFactory?
        get() = _factory

    /**
     * Register a provider using a lambda. Call this at app startup before using NaverMap.
     * This is the preferred Kotlin API.
     *
     * Usage:
     * ```kotlin
     * GraniteNaverMapRegistry.register { context ->
     *     MyNaverMapProvider(context)
     * }
     * ```
     */
    fun register(creator: GraniteNaverMapProviderCreator) {
        _factory = LambdaProviderFactory(creator)
    }

    /**
     * Register a custom provider factory. Call this at app startup before using NaverMap.
     * This API is provided for Java compatibility.
     */
    fun register(factory: GraniteNaverMapProviderFactory) {
        _factory = factory
    }

    /**
     * Create a new provider instance for a NaverMap view.
     * Each view should call this to get its own provider instance.
     *
     * @return A new provider instance, or null if no factory is registered and default provider is not included
     */
    fun createProvider(context: Context): GraniteNaverMapProvider? {
        // Use registered factory if available
        _factory?.let { return it.createProvider(context) }

        // Only try to create built-in provider if it's included in the build
        if (BuildConfig.INCLUDE_DEFAULT_PROVIDER) {
            return createBuiltInProviderFactory()?.createProvider(context)
        }

        return null
    }

    /**
     * Create built-in provider factory using reflection to avoid compile-time dependency
     */
    private fun createBuiltInProviderFactory(): GraniteNaverMapProviderFactory? {
        return try {
            val clazz = Class.forName("run.granite.navermap.builtinProvider.BuiltInGraniteNaverMapProviderFactory")
            clazz.getDeclaredConstructor().newInstance() as GraniteNaverMapProviderFactory
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Check if a custom factory has been registered
     */
    val hasCustomFactory: Boolean
        get() = _factory != null

    /**
     * Check if the default provider is available in this build
     */
    val hasDefaultProvider: Boolean
        get() = BuildConfig.INCLUDE_DEFAULT_PROVIDER

    /**
     * Reset the factory (useful for testing)
     */
    fun reset() {
        _factory = null
    }
}
