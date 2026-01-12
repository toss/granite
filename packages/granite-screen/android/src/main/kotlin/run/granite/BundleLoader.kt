package run.granite

import com.facebook.react.bridge.ReactContext

/**
 * Interface for loading React Native bundles from various sources Implementations can provide
 * different loading strategies (CDN, local, etc.)
 */
interface BundleLoader {
    /**
     * Load a bundle and return the source information This method should handle all loading logic
     * including:
     * - Development server detection
     * - Bundle downloading
     * - Caching
     * - Fallback strategies
     */
    suspend fun loadBundle(): BundleSource

    companion object {
        /**
         * Evaluates JavaScript code on the JSI runtime
         * @param scriptData The JavaScript code as a byte array
         * @param url The source URL for error reporting
         * @param reactContext The React context containing the JSI runtime
         */
        fun evaluate(
            scriptData: ByteArray,
            url: String,
            reactContext: ReactContext,
        ) {
            val evaluator = BundleEvaluator(reactContext)
            evaluator.evaluate(scriptData, url)
        }
    }
}

/** Represents the source of a React Native bundle */
sealed class BundleSource {
    /** Development mode: Bundle served from Metro bundler */
    data class DevServer(
        val host: String = "localhost",
        val port: Int = 8081,
        val componentName: String? = null,
    ) : BundleSource()

    /** Production mode: Bundle from CDN or APK */
    data class Production(
        val location: ProductionLocation,
        val componentName: String? = null,
    ) : BundleSource()
}

/** Represents the location of a production bundle */
sealed class ProductionLocation {
    /** @param path Local file path after download */
    data class FileSystemBundle(
        val filePath: String,
    ) : ProductionLocation()

    /** Bundle embedded in APK assets */
    data object EmbeddedBundle : ProductionLocation()
}
