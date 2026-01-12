package run.granite

/**
 * Default BundleLoader implementation matching the iOS example.
 * - DEBUG: loads from Metro dev server (localhost:8081)
 * - RELEASE: uses embedded APK asset bundle
 */
class DefaultBundleLoader(
    private val moduleName: String,
) : BundleLoader {
    override suspend fun loadBundle(): BundleSource =
        if (BuildConfig.DEBUG) {
            BundleSource.DevServer(host = "localhost", port = 8081, componentName = moduleName)
        } else {
            BundleSource.Production(
                location = ProductionLocation.EmbeddedBundle,
                componentName = moduleName,
            )
        }
}
