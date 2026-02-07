package run.granite.gradle

import com.android.build.api.variant.ApplicationAndroidComponentsExtension
import com.android.build.api.variant.LibraryAndroidComponentsExtension
import run.granite.gradle.config.DependencyConfigurator
import org.gradle.api.JavaVersion
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.artifacts.Configuration

/**
 * Granite Root Project Plugin
 *
 * Plugin applied to the root project to automatically configure
 * React Native dependency substitution.
 *
 * This plugin performs the following roles:
 * - react-native → react-android dependency substitution
 * - hermes-engine → hermes-android dependency substitution
 * - com.facebook.react:hermes-android → com.facebook.hermes:hermes-android substitution (RN 0.84+)
 * - Version forcing (force)
 *
 * Usage:
 * ```
 * // root build.gradle.kts
 * plugins {
 *     id("run.granite.rootproject")
 * }
 *
 * graniteRoot {
 *     // Optional: Explicit version override
 *     // reactNativeVersion.set("0.84.0")
 *     // hermesVersion.set("250829098.0.6")
 * }
 * ```
 *
 * @see GraniteRootExtension for configuration options
 */
class GraniteRootProjectPlugin : Plugin<Project> {

    companion object {
        /** Plugin identifier used in build.gradle.kts: `id("run.granite.rootproject")`. */
        const val PLUGIN_ID = "run.granite.rootproject"
        /** Name of the DSL extension block: `graniteRoot { ... }`. */
        const val EXTENSION_NAME = "graniteRoot"
        // Uses Granite-specific properties (operates independently from react.internal.*)
        private const val INTERNAL_DISABLE_JAVA_VERSION_ALIGNMENT =
            "granite.internal.disableJavaVersionAlignment"
    }

    override fun apply(project: Project) {
        // 1. Root project validation
        validateRootProject(project)

        // 2. Create extension
        val extension = project.extensions.create(
            EXTENSION_NAME,
            GraniteRootExtension::class.java,
            project
        )

        // 3. Configure PrivateReactExtension for React Native Gradle Plugin compatibility
        configurePrivateReactExtension(project)

        // 4. Configure Java toolchains IMMEDIATELY (before afterEvaluate)
        // This must run before afterEvaluate for finalizeDsl to work
        configureJavaToolChains(project)

        // 5. Configure dependency substitution after evaluation
        project.afterEvaluate {
            configureDependencySubstitution(project, extension)
        }

        project.logger.lifecycle("Granite Root Project plugin applied to ${project.name}")
    }

    private fun validateRootProject(project: Project) {
        if (project != project.rootProject) {
            error("""
                |Granite Root Project plugin can only be applied to the root project.
                |
                |Current project: ${project.path}
                |Root project: ${project.rootProject.path}
                |
                |Solution: Move the plugin application to your root build.gradle.kts:
                |  plugins {
                |      id("run.granite.rootproject")
                |  }
            """.trimMargin())
        }
    }

    private fun configureDependencySubstitution(project: Project, extension: GraniteRootExtension) {
        val coordinates = extension.getCoordinates()
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)
        val hermesVersion = coordinates.getEffectiveHermesVersion()

        project.logger.lifecycle(
            "Granite: Configuring dependency substitution " +
            "(react: ${coordinates.reactVersion}, hermes: $hermesVersion)"
        )

        project.allprojects {
            val targetProject = this

            targetProject.configurations.all configBlock@{
                // Filter: only Classpath configurations
                if (!name.endsWith("CompileClasspath") && !name.endsWith("RuntimeClasspath")) {
                    return@configBlock
                }
                // Filter: skip AGP internal metadata configurations
                if (name.contains("Metadata", ignoreCase = true)) {
                    return@configBlock
                }
                // Skip already resolved or non-resolvable configurations
                if (!isCanBeResolved || state == Configuration.State.RESOLVED) {
                    return@configBlock
                }

                // Apply dependency substitution rules
                resolutionStrategy.dependencySubstitution {
                    for ((oldCoordinate, newCoordinate, reason) in substitutions) {
                        substitute(module(oldCoordinate))
                            .using(module(newCoordinate))
                            .because(reason)
                    }
                }

                // Force versions for consistency
                resolutionStrategy.force(
                    "${coordinates.reactGroup}:react-android:${coordinates.reactVersion}",
                    "${coordinates.hermesGroup}:hermes-android:$hermesVersion"
                )
            }
        }

        project.logger.lifecycle(
            "Granite: Dependency substitution configured for all projects " +
            "(${substitutions.size} rules applied)"
        )
    }

    /**
     * Configures Java 17 toolchain for all projects.
     *
     * Uses finalizeDsl in the same way as React Native's JdkConfiguratorUtils.kt.
     * finalizeDsl runs after the android { } block evaluation but before AGP internal finalization.
     *
     * - Sets Java 17 for projects with com.android.application / com.android.library plugins
     * - Sets jvmToolchain(17) for org.jetbrains.kotlin.android / org.jetbrains.kotlin.jvm plugins
     *
     * Disable: Set granite.internal.disableJavaVersionAlignment=true in gradle.properties
     *
     * @param project Root project
     */
    private fun configureJavaToolChains(project: Project) {
        // Check if disabled at root project level
        if (project.hasProperty(INTERNAL_DISABLE_JAVA_VERSION_ALIGNMENT)) {
            project.logger.lifecycle("Granite: Java version alignment disabled via property")
            return
        }

        project.allprojects {
            val targetProject = this

            // Can also be disabled at project level
            if (targetProject.hasProperty(INTERNAL_DISABLE_JAVA_VERSION_ALIGNMENT)) {
                return@allprojects
            }

            // Android Application plugin - set compileOptions via finalizeDsl
            targetProject.pluginManager.withPlugin("com.android.application") {
                targetProject.extensions
                    .getByType(ApplicationAndroidComponentsExtension::class.java)
                    .finalizeDsl { ext ->
                        ext.compileOptions.sourceCompatibility = JavaVersion.VERSION_17
                        ext.compileOptions.targetCompatibility = JavaVersion.VERSION_17
                    }
            }

            // Android Library plugin - set compileOptions via finalizeDsl
            targetProject.pluginManager.withPlugin("com.android.library") {
                targetProject.extensions
                    .getByType(LibraryAndroidComponentsExtension::class.java)
                    .finalizeDsl { ext ->
                        ext.compileOptions.sourceCompatibility = JavaVersion.VERSION_17
                        ext.compileOptions.targetCompatibility = JavaVersion.VERSION_17
                    }
            }

            // Kotlin Android plugin (uses reflection to avoid compile-time dependency)
            targetProject.pluginManager.withPlugin("org.jetbrains.kotlin.android") {
                try {
                    val kotlinExtension = targetProject.extensions.findByName("kotlin")
                    if (kotlinExtension != null) {
                        val jvmToolchainMethod = kotlinExtension.javaClass
                            .getMethod("jvmToolchain", Int::class.javaPrimitiveType)
                        jvmToolchainMethod.invoke(kotlinExtension, 17)
                    }
                } catch (e: Exception) {
                    targetProject.logger.debug(
                        "Granite: Could not set jvmToolchain for ${targetProject.name}: ${e.message}"
                    )
                }
            }

            // Kotlin JVM plugin configuration
            targetProject.pluginManager.withPlugin("org.jetbrains.kotlin.jvm") {
                try {
                    val kotlinExtension = targetProject.extensions.findByName("kotlin")
                    if (kotlinExtension != null) {
                        val jvmToolchainMethod = kotlinExtension.javaClass
                            .getMethod("jvmToolchain", Int::class.javaPrimitiveType)
                        jvmToolchainMethod.invoke(kotlinExtension, 17)
                    }
                } catch (e: Exception) {
                    targetProject.logger.debug(
                        "Granite: Could not set jvmToolchain for ${targetProject.name}: ${e.message}"
                    )
                }
            }
        }

        project.logger.lifecycle("Granite: Configured Java 17 toolchain for all projects")
    }

    /**
     * Pre-emptively creates and configures PrivateReactExtension from the React Native Gradle Plugin.
     *
     * Background:
     * - PrivateReactExtension is created on the rootProject to share configuration between app and library modules
     * - The default convention assumes rootProject.dir/../ (standard RN app's android/ directory structure)
     * - In monorepo setups where rootProject.dir IS the package.json location, ../ points to the wrong path
     * - When the application module does not apply com.facebook.react, root.set() is never called
     *
     * Solution:
     * - This plugin creates the extension first and sets root to rootProject.dir
     * - ReactPlugin uses findByType to reuse an existing extension, so there is no conflict
     */
    private fun configurePrivateReactExtension(project: Project) {
        try {
            val privateReactExtensionClass = Class.forName(
                "com.facebook.react.internal.PrivateReactExtension"
            )

            val existing = project.extensions.findByType(privateReactExtensionClass)
            if (existing != null) {
                // If already exists, only configure root
                setRootProperty(existing, project)
                project.logger.lifecycle(
                    "Granite: Configured existing PrivateReactExtension root to ${project.projectDir}"
                )
                return
            }

            // Create new instance
            val extension = project.extensions.create(
                "privateReact",
                privateReactExtensionClass,
                project
            )
            setRootProperty(extension, project)
            project.logger.lifecycle(
                "Granite: Created PrivateReactExtension with root=${project.projectDir}"
            )
        } catch (e: Exception) {
            project.logger.warn(
                "Granite: Could not configure PrivateReactExtension: ${e.message}. " +
                "React Native Gradle Plugin may not be available on the classpath."
            )
        }
    }

    private fun setRootProperty(extension: Any, project: Project) {
        try {
            val rootProperty = extension.javaClass.getMethod("getRoot").invoke(extension)
            if (rootProperty is org.gradle.api.file.DirectoryProperty) {
                rootProperty.set(project.layout.projectDirectory)
            }
        } catch (e: Exception) {
            project.logger.warn(
                "Granite: Could not set PrivateReactExtension root: ${e.message}"
            )
        }
    }
}
