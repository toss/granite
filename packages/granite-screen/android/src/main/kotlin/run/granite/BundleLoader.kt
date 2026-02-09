package run.granite

/**
 * Interface for loading React Native bundles from various sources Implementations can provide
 * different loading strategies (CDN, local, etc.)
 */
interface BundleLoader {
    /** Load a bundle and return the source information. */
    suspend fun loadBundle(): BundleSource
}

/** Represents the source of a React Native bundle */
sealed class BundleSource {
    /** The React component name registered via AppRegistry.registerComponent(). */
    abstract val componentName: String?

    /** Development mode: Bundle served from Metro bundler */
    data class DevServer(
        val host: String = "localhost",
        val port: Int = 8081,
        override val componentName: String? = null,
    ) : BundleSource()

    /** Production mode: Bundle from CDN or APK */
    data class Production(
        val location: ProductionLocation,
        override val componentName: String? = null,
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
