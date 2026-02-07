package run.granite.gradle.config

import com.android.build.gradle.LibraryExtension
import run.granite.gradle.GraniteExtension
import org.gradle.api.Project

/**
 * Configurator for Android resource packaging options.
 *
 * Configures:
 * - Bundle compression settings (aaptOptions.noCompress)
 * - Resource merging behavior
 * - Asset packaging optimizations
 */
class ResourceConfigurator(
    private val project: Project,
    private val extension: GraniteExtension
) {

    /**
     * Configures Android resource packaging options.
     *
     * Sets up:
     * 1. Bundle compression control based on extension settings
     * 2. No-compress patterns for JavaScript bundles
     */
    fun configure(androidExtension: LibraryExtension) {
        configureAaptOptions(androidExtension)
        project.logger.debug("Resource packaging configured")
    }

    /**
     * Configures AAPT options for bundle compression.
     *
     * If bundle compression is disabled, adds bundle file patterns to noCompress list
     * to prevent APK/AAR packaging from compressing already-compressed Hermes bytecode.
     */
    private fun configureAaptOptions(androidExtension: LibraryExtension) {
        androidExtension.packaging {
            resources {
                // Don't compress JavaScript bundles if they're already gzip compressed
                if (!extension.bundleCompressionEnabled.get()) {
                    excludes.add("**/*.bundle")
                    excludes.add("**/*.hbc")
                }

                // Always exclude .map files from compression
                excludes.add("**/*.map")
            }
        }

        project.logger.lifecycle(
            "Bundle compression: ${if (extension.bundleCompressionEnabled.get()) "enabled" else "disabled"}"
        )
    }
}
