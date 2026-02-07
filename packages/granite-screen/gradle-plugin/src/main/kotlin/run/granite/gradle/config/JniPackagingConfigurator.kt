package run.granite.gradle.config

import com.android.build.api.variant.Variant
import com.android.build.api.variant.LibraryAndroidComponentsExtension
import run.granite.gradle.GraniteExtension
import org.gradle.api.Project

/**
 * Configures JNI library packaging options for React Native native modules.
 *
 * This configurator sets up pickFirst rules to handle duplicate .so files
 * from various React Native dependencies. Based on React Native Gradle Plugin's
 * NdkConfiguratorUtils.configureJsEnginePackagingOptions and configureNewArchPackagingOptions.
 *
 * Key responsibilities:
 * - Configure Hermes .so file packaging (libhermes.so, libhermestooling.so)
 * - Configure fbjni and c++_shared library packaging
 * - Configure React Native core library packaging (libreactnative.so, libjsi.so)
 * - Exclude JSC libraries when Hermes is enabled
 *
 * Without proper packaging configuration, duplicate .so files from multiple AARs
 * will cause build failures or runtime crashes.
 */
class JniPackagingConfigurator(
    private val project: Project,
    private val extension: GraniteExtension
) {

    /**
     * Configures JNI packaging options for all build variants.
     *
     * Must be called during plugin configuration (typically in apply() or afterEvaluate).
     */
    fun configure(androidComponents: LibraryAndroidComponentsExtension) {
        project.logger.lifecycle("Configuring JNI packaging options for React Native")

        // Configure packaging for each variant
        androidComponents.onVariants { variant ->
            val hermesEnabled = true // Hermes is always enabled
            val newArchEnabled = true // New Architecture is mandatory

            project.logger.debug(
                "Configuring packaging for variant ${variant.name}: " +
                "hermesEnabled=$hermesEnabled (mandatory), newArchEnabled=$newArchEnabled (mandatory)"
            )

            // Configure JS engine packaging (Hermes only)
            configureJsEnginePackaging(variant, hermesEnabled)

            // Configure New Architecture packaging
            configureNewArchPackaging(variant, newArchEnabled)

            project.logger.debug("Packaging configuration complete for variant ${variant.name}")
        }
    }

    /**
     * Configures JavaScript engine .so file packaging.
     *
     * Based on NdkConfiguratorUtils.configureJsEnginePackagingOptions.
     *
     * When Hermes is enabled:
     * - Exclude JSC libraries (libjsc.so, libjsctooling.so)
     * - Include Hermes libraries (libhermes.so, libhermestooling.so) as pickFirst
     *
     * When JSC is enabled:
     * - Exclude Hermes libraries
     * - Include JSC libraries as pickFirst
     *
     * @param variant The build variant being configured
     * @param hermesEnabled Whether Hermes is enabled for this build
     */
    private fun configureJsEnginePackaging(
        variant: com.android.build.api.variant.Variant,
        hermesEnabled: Boolean
    ) {
        if (hermesEnabled) {
            // Hermes enabled: exclude JSC, include Hermes
            variant.packaging.jniLibs.excludes.addAll(
                listOf(
                    "**/libjsc.so",
                    "**/libjsctooling.so"
                )
            )
            variant.packaging.jniLibs.pickFirsts.addAll(
                listOf(
                    "**/libhermes.so",
                    "**/libhermestooling.so"
                )
            )

            project.logger.debug("Configured Hermes packaging: excluding JSC, including Hermes")
        } else {
            // JSC enabled (not supported by Granite, but keep for compatibility)
            variant.packaging.jniLibs.excludes.addAll(
                listOf(
                    "**/libhermes.so",
                    "**/libhermestooling.so"
                )
            )
            variant.packaging.jniLibs.pickFirsts.addAll(
                listOf(
                    "**/libjsc.so",
                    "**/libjsctooling.so"
                )
            )

            project.logger.warn(
                "JSC packaging configured, but Granite plugin only supports Hermes. " +
                "This configuration may cause runtime errors."
            )
        }
    }

    /**
     * Configures New Architecture .so file packaging.
     *
     * Based on NdkConfiguratorUtils.configureNewArchPackagingOptions.
     *
     * For Old Architecture:
     * - pickFirst for fbjni and c++_shared (commonly duplicated)
     *
     * For New Architecture:
     * - pickFirst for fbjni, c++_shared, libreactnative.so, libjsi.so
     *
     * @param variant The build variant being configured
     * @param newArchEnabled Whether New Architecture is enabled
     */
    private fun configureNewArchPackaging(
        variant: com.android.build.api.variant.Variant,
        newArchEnabled: Boolean
    ) {
        if (!newArchEnabled) {
            // Old Architecture: basic pickFirst for common duplicates
            variant.packaging.jniLibs.pickFirsts.addAll(
                listOf(
                    "**/libfbjni.so",
                    "**/libc++_shared.so"
                )
            )

            project.logger.debug("Configured Old Architecture packaging: basic pickFirsts")
        } else {
            // New Architecture: additional React Native core libraries
            variant.packaging.jniLibs.pickFirsts.addAll(
                listOf(
                    // FBJNI provided via prefab
                    "**/libfbjni.so",
                    // React Native prefab libraries
                    "**/libreactnative.so",
                    "**/libjsi.so",
                    // C++ standard library
                    "**/libc++_shared.so"
                )
            )

            project.logger.debug("Configured New Architecture packaging: extended pickFirsts")
        }
    }
}
