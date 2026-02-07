package run.granite.gradle.config

/**
 * Dependency coordinate information for React Native and Hermes.
 *
 * @property reactVersion React Native version (e.g., "0.84.0-rc.4")
 * @property hermesVersion Hermes Classic version (e.g., "0.15.0")
 * @property hermesV1Version Hermes V1 version (e.g., "250829098.0.6")
 * @property reactGroup React Native Maven group (default: com.facebook.react)
 * @property hermesGroup Hermes Maven group (default: com.facebook.hermes)
 */
data class DependencyCoordinates(
    val reactVersion: String,
    val hermesVersion: String,
    val hermesV1Version: String,
    val reactGroup: String = DEFAULT_REACT_GROUP,
    val hermesGroup: String = DEFAULT_HERMES_GROUP
) {
    companion object {
        const val DEFAULT_REACT_GROUP = "com.facebook.react"
        const val DEFAULT_HERMES_GROUP = "com.facebook.hermes"
    }

    /**
     * Returns the Hermes version to use.
     * Granite always uses Hermes V1.
     */
    fun getEffectiveHermesVersion(): String =
        if (hermesV1Version.isNotBlank()) hermesV1Version else hermesVersion
}
