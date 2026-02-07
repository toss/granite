package run.granite.gradle.config

import com.android.build.gradle.LibraryExtension
import run.granite.gradle.GraniteExtension
import run.granite.gradle.utils.ReactNativeVersionReader
import org.gradle.api.JavaVersion
import org.gradle.api.Project

/**
 * Configures React Native and related dependencies for the library module.
 *
 * This configurator automatically adds required dependencies:
 * - react-native (implementation)
 * - hermes-android (implementation)
 * - soloader (implementation)
 *
 * Versions are resolved from the React Native installation to ensure compatibility.
 */
class DependencyConfigurator(
    private val project: Project,
    private val extension: GraniteExtension
) {

    companion object {
        // Default Maven group (official React Native Maven group)
        const val DEFAULT_GROUP = "com.facebook.react"

        // Dependency coordinates
        private const val REACT_NATIVE_ARTIFACT = "react-android"
        private const val HERMES_ARTIFACT = "hermes-android"

        private const val SOLOADER_GROUP = "com.facebook.soloader"
        private const val SOLOADER_ARTIFACT = "soloader"
        private const val SOLOADER_VERSION = "0.12.1" // Compatible with RN 0.84+

        // Deprecated coordinates for substitution
        private const val DEPRECATED_REACT_NATIVE = "com.facebook.react:react-native"
        private const val DEPRECATED_HERMES_ENGINE = "com.facebook.react:hermes-engine"

        // Hermes group (RN 0.84+)
        private const val HERMES_GROUP = "com.facebook.hermes"

        // Additional deprecated coordinate
        private const val DEPRECATED_HERMES_ANDROID = "com.facebook.react:hermes-android"

        /**
         * Creates dependency substitution rules.
         *
         * @param version React Native version
         * @param group React Native Maven group (default: com.facebook.react)
         * @return List of triples (original coordinate, replacement coordinate, reason)
         */
        fun getDependencySubstitutions(
            version: String,
            group: String
        ): List<Triple<String, String, String>> {
            val substitutions = mutableListOf<Triple<String, String, String>>()

            // Base substitution rules: deprecated coordinates → new coordinates
            substitutions.add(Triple(
                DEPRECATED_REACT_NATIVE,
                "$group:$REACT_NATIVE_ARTIFACT:$version",
                "The react-native artifact was deprecated in favor of react-android"
            ))
            substitutions.add(Triple(
                DEPRECATED_HERMES_ENGINE,
                "$group:$HERMES_ARTIFACT:$version",
                "The hermes-engine artifact was deprecated in favor of hermes-android"
            ))

            // Cross-group substitution: when using custom Maven group
            if (group != DEFAULT_GROUP) {
                substitutions.add(Triple(
                    "$DEFAULT_GROUP:$REACT_NATIVE_ARTIFACT",
                    "$group:$REACT_NATIVE_ARTIFACT:$version",
                    "Modified to use correct Maven group"
                ))
                substitutions.add(Triple(
                    "$DEFAULT_GROUP:$HERMES_ARTIFACT",
                    "$group:$HERMES_ARTIFACT:$version",
                    "Modified to use correct Maven group"
                ))
            }

            return substitutions
        }

        /**
         * Creates dependency substitution rules (DependencyCoordinates version).
         *
         * Supports the new Hermes group structure in React Native 0.84+:
         * - com.facebook.react:react-native → {reactGroup}:react-android:{reactVersion}
         * - com.facebook.react:hermes-engine → {hermesGroup}:hermes-android:{hermesVersion}
         * - com.facebook.react:hermes-android → {hermesGroup}:hermes-android:{hermesVersion}
         *
         * @param coordinates Dependency coordinate information
         * @return List of triples (original coordinate, replacement coordinate, reason)
         */
        fun getDependencySubstitutions(coordinates: DependencyCoordinates): List<Triple<String, String, String>> {
            val substitutions = mutableListOf<Triple<String, String, String>>()
            val hermesVersion = coordinates.getEffectiveHermesVersion()
            val hermesCoordinate = "${coordinates.hermesGroup}:$HERMES_ARTIFACT:$hermesVersion"

            // 1. react-native -> react-android
            substitutions.add(Triple(
                DEPRECATED_REACT_NATIVE,
                "${coordinates.reactGroup}:$REACT_NATIVE_ARTIFACT:${coordinates.reactVersion}",
                "The react-native artifact was deprecated in favor of react-android"
            ))

            // 2. hermes-engine -> hermes-android (new group)
            substitutions.add(Triple(
                DEPRECATED_HERMES_ENGINE,
                hermesCoordinate,
                "The hermes-engine artifact was deprecated in favor of hermes-android"
            ))

            // 3. com.facebook.react:hermes-android → com.facebook.hermes:hermes-android (NEW!)
            substitutions.add(Triple(
                DEPRECATED_HERMES_ANDROID,
                hermesCoordinate,
                "The hermes-android artifact was moved to com.facebook.hermes publishing group"
            ))

            // 4. Custom React group substitution
            if (coordinates.reactGroup != DEFAULT_GROUP) {
                substitutions.add(Triple(
                    "$DEFAULT_GROUP:$REACT_NATIVE_ARTIFACT",
                    "${coordinates.reactGroup}:$REACT_NATIVE_ARTIFACT:${coordinates.reactVersion}",
                    "Modified to use correct Maven group"
                ))
            }

            // 5. Custom Hermes group substitution
            if (coordinates.hermesGroup != HERMES_GROUP) {
                substitutions.add(Triple(
                    "$HERMES_GROUP:$HERMES_ARTIFACT",
                    hermesCoordinate,
                    "Modified to use correct Maven group"
                ))
            }

            return substitutions
        }
    }


    /**
     * Configures all required React Native dependencies.
     *
     * Called during project evaluation (afterEvaluate) to ensure configuration is complete.
     */
    fun configure() {
        val reactNativeDir = extension.getReactNativeDirResolved()

        // Read all coordinates (React + Hermes)
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)
        ReactNativeVersionReader.validateVersion(coordinates.reactVersion)

        project.logger.lifecycle(
            "Configuring React Native dependencies (version: ${coordinates.reactVersion}, " +
            "hermes: ${coordinates.getEffectiveHermesVersion()}, " +
            "hermesGroup: ${coordinates.hermesGroup})"
        )

        // Note: Dependency substitution is now handled by run.granite.rootproject plugin.
        // See GraniteRootProjectPlugin for the centralized substitution logic.

        // Add React Native core dependencies
        addReactNativeDependencies(coordinates.reactVersion, coordinates.reactGroup)

        // Add Hermes engine
        addHermesDependency(coordinates)

        // Add SoLoader (required for native library loading)
        addSoLoaderDependency()

    }


    /**
     * Adds React Native core dependencies.
     */
    private fun addReactNativeDependencies(version: String, group: String) {
        project.dependencies.add(
            "implementation",
            "$group:$REACT_NATIVE_ARTIFACT:$version"
        )

        project.logger.debug("Added dependency: $group:$REACT_NATIVE_ARTIFACT:$version")
    }

    /**
     * Adds Hermes JavaScript engine dependency.
     *
     * Hermes is always enabled - JSC is not supported.
     */
    private fun addHermesDependency(reactNativeVersion: String, group: String) {
        // Hermes is always enabled in Granite plugin
        project.dependencies.add(
            "implementation",
            "$group:$HERMES_ARTIFACT:$reactNativeVersion"
        )

        project.logger.debug("Added dependency: $group:$HERMES_ARTIFACT:$reactNativeVersion")
    }

    /**
     * Adds Hermes JavaScript engine dependency (DependencyCoordinates version).
     */
    private fun addHermesDependency(coordinates: DependencyCoordinates) {
        val hermesVersion = coordinates.getEffectiveHermesVersion()
        project.dependencies.add(
            "implementation",
            "${coordinates.hermesGroup}:$HERMES_ARTIFACT:$hermesVersion"
        )

        project.logger.debug("Added dependency: ${coordinates.hermesGroup}:$HERMES_ARTIFACT:$hermesVersion")
    }

    /**
     * Adds SoLoader dependency for native library loading.
     */
    private fun addSoLoaderDependency() {
        project.dependencies.add(
            "implementation",
            "$SOLOADER_GROUP:$SOLOADER_ARTIFACT:$SOLOADER_VERSION"
        )

        project.logger.debug("Added dependency: $SOLOADER_GROUP:$SOLOADER_ARTIFACT:$SOLOADER_VERSION")
    }

}
