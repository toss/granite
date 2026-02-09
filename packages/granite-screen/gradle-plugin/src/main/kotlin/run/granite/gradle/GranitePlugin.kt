package run.granite.gradle

import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.gradle.LibraryExtension
import org.gradle.api.Action
import org.gradle.api.JavaVersion
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.TaskProvider
import run.granite.gradle.config.BuildConfigConfigurator
import run.granite.gradle.config.DependencyConfigurator
import run.granite.gradle.config.DevServerResourceConfigurator
import run.granite.gradle.config.JniPackagingConfigurator
import run.granite.gradle.config.NdkConfigurator
import run.granite.gradle.config.RepositoryConfigurator
import run.granite.gradle.config.ResourceConfigurator
import run.granite.gradle.tasks.AssetPackagingTask
import run.granite.gradle.tasks.AutolinkingTask
import run.granite.gradle.tasks.BundleTask
import run.granite.gradle.tasks.CodegenArtifactsTask
import run.granite.gradle.tasks.CodegenSchemaTask
import run.granite.gradle.utils.AutolinkingParser
import run.granite.gradle.utils.ConflictDetector
import run.granite.gradle.utils.JdkValidator
import run.granite.gradle.utils.NodeExecutableFinder
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Granite Gradle Plugin
 *
 * Enables packaging React Native functionality within Android library modules (AAR files).
 *
 * This plugin automates:
 * - Codegen for TurboModules and Fabric components
 * - Autolinking for native module discovery
 * - Native compilation (CMake/NDK) with Prefab packaging
 * - JavaScript bundling and Hermes bytecode compilation
 *
 * The plugin only applies to Android library modules (not application modules) and
 * enforces that only one library module per dependency tree can use the plugin.
 *
 * Requirements:
 * - JDK 17+
 * - Gradle 8.x+
 * - Android Gradle Plugin 7.x+
 * - React Native 0.81.x+
 * - Hermes JavaScript engine (always enabled, JSC not supported)
 *
 * @see GraniteExtension for configuration options
 */
class GranitePlugin : Plugin<Project> {

  companion object {
    const val PLUGIN_ID = "run.granite.library"
    const val EXTENSION_NAME = "granite"
    const val PLUGIN_GROUP = "granite"
  }

  override fun apply(project: Project) {
    // Validate JDK version
    JdkValidator.validate(project)

    // Detect plugin conflicts
    ConflictDetector.validateNoConflicts(project)

    // Validate this is a library module
    validateLibraryModule(project)

    // Create the granite {} extension
    val extension = project.extensions.create(
      EXTENSION_NAME,
      GraniteExtension::class.java,
      project,
    )

    // Apply Android Library plugin if not already applied
    project.pluginManager.apply("com.android.library")

    // Get Android extension for early configuration
    val androidExtension = project.extensions.getByType(LibraryExtension::class.java)

    // Configure JDK toolchain (Java 17)
    configureJdkToolchain(project, androidExtension)

    // Configure Java 17 for node_modules projects early (before AGP finalization)
    // Ensure autolinked modules are compiled with Java 17
    configureNodeModulesJavaVersion(project)

    // Configure NDK/CMake settings early
    // This must be done before afterEvaluate to avoid "too late to set path" error
    val ndkConfigurator = NdkConfigurator(project, extension, androidExtension)
    ndkConfigurator.configure()

    // Configure resource packaging early
    // This must be done before afterEvaluate to avoid "too late to modify excludes" error
    val resourceConfigurator = ResourceConfigurator(project, extension)
    resourceConfigurator.configure(androidExtension)

    // Get Android Components Extension for variant-aware configuration
    val androidComponents = project.extensions.getByType(LibraryAndroidComponentsExtension::class.java)

    // Configure JNI packaging options early (CRITICAL for Hermes)
    // This must be done before variant processing to avoid duplicate .so file conflicts
    val jniPackagingConfigurator = JniPackagingConfigurator(project, extension)
    jniPackagingConfigurator.configure(androidComponents)

    // CRITICAL: Register generated sources at DSL and variant level BEFORE afterEvaluate
    // This must happen early so finalizeDsl and onVariants callbacks can be registered
    // before the variant processing phase begins
    registerGeneratedSourcesInDsl(project, androidComponents)
    registerGeneratedSourcesInVariants(project, androidComponents)

    // Register variant-aware tasks BEFORE afterEvaluate
    // This must be done early to avoid "too late to add actions" error
    registerBundleAndAssetTasksEarly(project, extension, androidComponents)

    // Configure after Android plugin is evaluated
    project.afterEvaluate {
      configurePlugin(project, extension, androidComponents)
    }
  }

  private fun validateLibraryModule(project: Project) {
    project.pluginManager.withPlugin("com.android.application") {
      error(
        """
                |Granite plugin can only be applied to Android library modules, not application modules.
                |
                |The plugin was applied to '${project.path}', which is an Android application module.
                |
                |Solution: Remove the 'run.granite.library' plugin from application modules.
                |Library modules using React Native should apply this plugin, and app modules
                |should simply add the library as a dependency.
                |
                |Example (library module build.gradle):
                |  plugins {
                |      id("com.android.library")
                |      id("run.granite.library")
                |  }
                |
                |Example (app module build.gradle):
                |  dependencies {
                |      implementation(project(":your-library-module"))
                |  }
        """.trimMargin(),
      )
    }
  }

  /**
   * Configures Java/Kotlin toolchain to Java 17.
   *
   * Equivalent to @react-native/gradle-plugin's JdkConfiguratorUtils.configureJavaToolChains().
   */
  private fun configureJdkToolchain(project: Project, androidExtension: LibraryExtension) {
    // Configure Java 17 source/target compatibility
    androidExtension.compileOptions {
      sourceCompatibility = JavaVersion.VERSION_17
      targetCompatibility = JavaVersion.VERSION_17
    }

    // Configure Kotlin JVM target
    // Kotlin tasks typically follow Java targetCompatibility automatically,
    // but we explicitly set kotlinOptions.jvmTarget = "17"
    project.tasks.withType(org.gradle.api.tasks.compile.JavaCompile::class.java).configureEach {
      targetCompatibility = "17"
    }

    project.logger.debug("Configured JDK 17 toolchain for ${project.name}")
  }

  /**
   * Ensures autolinked modules are compiled with Java 17.
   *
   * Uses rootProject.allprojects to apply to already-configured projects.
   * Registers callbacks independent of plugin application timing via pluginManager.withPlugin.
   *
   * Pattern from React Native Gradle Plugin's JdkConfiguratorUtils.kt
   */
  private fun configureNodeModulesJavaVersion(project: Project) {
    // Apply to all projects using rootProject.allprojects (including already-configured projects)
    project.rootProject.allprojects.forEach { targetProject ->
      // Only target node_modules projects
      if (!targetProject.projectDir.absolutePath.contains("/node_modules/")) return@forEach

      // Configure Java 17 when Android Library plugin is applied
      targetProject.pluginManager.withPlugin("com.android.library") {
        val componentsExtension = targetProject.extensions
          .getByType(LibraryAndroidComponentsExtension::class.java)
        componentsExtension.finalizeDsl { libraryExtension ->
          libraryExtension.compileOptions.apply {
            sourceCompatibility = JavaVersion.VERSION_17
            targetCompatibility = JavaVersion.VERSION_17
          }
        }
        targetProject.logger.debug("Granite: Configured Java 17 for node_modules project: ${targetProject.name}")
      }

      // Configure jvmToolchain when Kotlin Android plugin is applied (using reflection)
      targetProject.pluginManager.withPlugin("org.jetbrains.kotlin.android") {
        try {
          // Use reflection since KotlinAndroidProjectExtension has no compile-time dependency
          val kotlinExtension = targetProject.extensions.findByName("kotlin")
          if (kotlinExtension != null) {
            val jvmToolchainMethod = kotlinExtension.javaClass.getMethod("jvmToolchain", Int::class.javaPrimitiveType)
            jvmToolchainMethod.invoke(kotlinExtension, 17)
            targetProject.logger.debug("Granite: Configured Kotlin jvmToolchain(17) for: ${targetProject.name}")
          }
        } catch (e: Exception) {
          // Fallback: jvmToolchain may not exist in some Kotlin versions
          targetProject.logger.debug("Granite: Could not set jvmToolchain for ${targetProject.name}: ${e.message}")
        }
      }
    }

    project.logger.debug("Granite: Registered Java 17 configuration for all node_modules projects")
  }

  private fun configurePlugin(
    project: Project,
    extension: GraniteExtension,
    androidComponents: LibraryAndroidComponentsExtension,
  ) {
    // Get Android extension
    val androidExtension = project.extensions.getByType(LibraryExtension::class.java)

    // Validate extension configuration
    extension.validate()

    // Configure Maven repositories
    val repositoryConfigurator = RepositoryConfigurator(project, extension)
    repositoryConfigurator.configure()

    // Configure React Native dependencies
    val dependencyConfigurator = DependencyConfigurator(project, extension)
    dependencyConfigurator.configure()

    // Run react-native config and autolink native module dependencies
    try {
      val autolinkingConfig = runReactNativeConfig(project, extension)
      autolinkLibrariesWithApp(project, autolinkingConfig)
    } catch (e: Exception) {
      project.logger.warn("Failed to autolink native module dependencies: ${e.message}")
      project.logger.debug("Autolinking failure details:", e)
    }

    // NDK/CMake settings already configured in apply() method before afterEvaluate
    // Resource packaging already configured in apply() method before afterEvaluate

    // Configure BuildConfig fields
    val buildConfigConfigurator = BuildConfigConfigurator(project, extension)
    buildConfigConfigurator.configure(androidExtension)

    // Generate dev server resources for debug builds
    val devServerResourceConfigurator = DevServerResourceConfigurator(project, extension)
    devServerResourceConfigurator.configure()

    // Register autolinking task
    val autolinkingTask = registerAutolinkingTask(project, extension, androidExtension)

    // Wire autolinking into compilation
    wireAutolinkingIntoCompilation(project, androidExtension, autolinkingTask)

    // Register codegen tasks
    val (codegenSchemaTask, codegenArtifactsTask) = registerCodegenTasks(project, extension, androidExtension)

    // Wire codegen tasks into compilation
    wireCodegenIntoCompilation(project, androidExtension, autolinkingTask, codegenSchemaTask, codegenArtifactsTask)

    // Note: Generated sources are registered early in apply() method before afterEvaluate
    // to avoid "too late to add actions" errors with finalizeDsl and onVariants

    // Bundle and asset packaging tasks were registered early (before afterEvaluate)
    // Now configure task dependencies
    configureBundleTaskDependencies(project, codegenArtifactsTask)

    project.logger.lifecycle("Granite plugin configured for library module: ${project.name}")
  }

  /**
   * Registers the AutolinkingTask.
   *
   * @return TaskProvider for the autolinking task
   */
  private fun registerAutolinkingTask(
    project: Project,
    extension: GraniteExtension,
    androidExtension: LibraryExtension,
  ): TaskProvider<AutolinkingTask> {
    val taskProvider = project.tasks.register("graniteAutolinking", AutolinkingTask::class.java)

    taskProvider.configure {
      reactNativeDir.set(extension.reactNativeDir.get())
      nodeModulesDir.set(extension.nodeModulesDir.get())
      projectDir.set(project.layout.projectDirectory)
      outputDir.set(project.layout.buildDirectory.dir("generated/autolinking"))

      // PackageList must be in com.facebook.react package to match React Native convention
      // This is the expected package that React Native code imports
      packageName.set("com.facebook.react")
      packageListFile.set(
        project.layout.buildDirectory.file("generated/autolinking/src/main/java/com/facebook/react/PackageList.java"),
      )

      // JNI autolinking output
      jniOutputDir.set(project.layout.buildDirectory.dir("generated/autolinking/src/main/jni"))
      autolinkingHeaderFile.set(
        project.layout.buildDirectory.file("generated/autolinking/src/main/jni/autolinking.h"),
      )
      autolinkingCppFile.set(
        project.layout.buildDirectory.file("generated/autolinking/src/main/jni/autolinking.cpp"),
      )
    }

    return taskProvider
  }

  /**
   * Wires the autolinking task into the compilation process.
   *
   * Ensures that PackageList.kt is generated before compilation starts.
   * Uses standard preBuild task dependency instead of pattern matching.
   *
   * Note: Source registration is handled by registerGeneratedSourcesInDsl/InVariants methods.
   */
  private fun wireAutolinkingIntoCompilation(
    project: Project,
    androidExtension: LibraryExtension,
    autolinkingTask: TaskProvider<AutolinkingTask>,
  ) {
    // Use standard preBuild dependency - more robust than pattern matching
    project.tasks.named("preBuild").configure {
      dependsOn(autolinkingTask)
    }

    // Make CMake tasks depend on autolinking (for JNI files)
    project.tasks.configureEach {
      if (name.startsWith("configureCMake")) {
        dependsOn(autolinkingTask)
      }
      if (name.startsWith("buildCMake")) {
        dependsOn(autolinkingTask)
      }
    }

    project.logger.debug("Autolinking task wired into preBuild and CMake")
  }

  /**
   * Registers the Codegen tasks (schema and artifacts).
   *
   * @return Pair of TaskProvider for (schema task, artifacts task)
   */
  private fun registerCodegenTasks(
    project: Project,
    extension: GraniteExtension,
    androidExtension: LibraryExtension,
  ): Pair<TaskProvider<CodegenSchemaTask>, TaskProvider<CodegenArtifactsTask>> {
    // Register CodegenSchemaTask
    val schemaTask = project.tasks.register("graniteCodegenSchema", CodegenSchemaTask::class.java)

    schemaTask.configure {
      // Determine JavaScript source directories
      val jsSources = mutableListOf<File>()
      val mainJsDir = project.file("src/main/js")
      if (mainJsDir.exists()) {
        jsSources.add(mainJsDir)
      }

      jsSourceDirs.set(jsSources)
      reactNativeDir.set(extension.reactNativeDir.get())
      nodeModulesDir.set(extension.nodeModulesDir.get())
      outputDir.set(project.layout.buildDirectory.dir("generated/codegen/schema"))
      schemaFile.set(
        project.layout.buildDirectory.file("generated/codegen/schema/schema.json"),
      )
    }

    // Register CodegenArtifactsTask
    val artifactsTask = project.tasks.register("graniteCodegenArtifacts", CodegenArtifactsTask::class.java)

    artifactsTask.configure {
      schemaFile.set(schemaTask.flatMap { task -> task.schemaFile })
      reactNativeDir.set(extension.reactNativeDir.get())
      nodeModulesDir.set(extension.nodeModulesDir.get())

      val namespace = androidExtension.namespace
        ?: project.group.toString().ifEmpty { "com.example.granite" }
      packageName.set(namespace)
      libraryName.set(project.name)

      javaOutputDir.set(project.layout.buildDirectory.dir("generated/codegen/java"))
      jniOutputDir.set(project.layout.buildDirectory.dir("generated/codegen/jni"))

      // Artifacts task depends on schema task
      dependsOn(schemaTask)
    }

    return Pair(schemaTask, artifactsTask)
  }

  /**
   * Wires the codegen tasks into the compilation process.
   *
   * Ensures that:
   * - Codegen runs after autolinking
   * - Codegen completes before compilation starts
   *
   * Uses standard preBuild task dependency instead of pattern matching.
   *
   * Note: Source registration is handled by registerGeneratedSourcesInDsl/InVariants methods.
   * Note: C++ sources are handled by CMake configuration, not source sets.
   */
  private fun wireCodegenIntoCompilation(
    project: Project,
    androidExtension: LibraryExtension,
    autolinkingTask: TaskProvider<AutolinkingTask>,
    codegenSchemaTask: TaskProvider<CodegenSchemaTask>,
    codegenArtifactsTask: TaskProvider<CodegenArtifactsTask>,
  ) {
    // Codegen schema should run after autolinking
    codegenSchemaTask.configure {
      mustRunAfter(autolinkingTask)
    }

    // Use standard preBuild dependency - more robust than pattern matching
    project.tasks.named("preBuild").configure {
      dependsOn(codegenArtifactsTask)
    }

    project.logger.debug("Codegen tasks wired into preBuild")
  }

  /**
   * Registers bundle and asset packaging tasks for each build variant.
   *
   * Creates per-variant tasks for:
   * - JavaScript bundling with Metro (graniteBundleXxx)
   * - Hermes bytecode compilation
   * - Asset packaging (granitePackageAssetsXxx)
   *
   * IMPORTANT: These tasks are NOT automatically executed during AAR builds.
   * Users must manually run them when bundle generation is needed.
   *
   * Example usage:
   *   # Generate bundle only
   *   ./gradlew graniteBundleRelease
   *
   *   # Generate bundle and package assets
   *   ./gradlew graniteBundleRelease granitePackageAssetsRelease
   *
   *   # Build AAR with bundled assets
   *   ./gradlew graniteBundleRelease granitePackageAssetsRelease bundleReleaseAar
   *
   * Must be called BEFORE afterEvaluate to avoid "too late to add actions" error.
   */
  private fun registerBundleAndAssetTasksEarly(
    project: Project,
    extension: GraniteExtension,
    componentsExtension: LibraryAndroidComponentsExtension,
  ) {
    componentsExtension.onVariants { variant ->
      val variantName = variant.name
      val capitalizedVariantName = variantName.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }

      // Determine if this is a debug/dev variant
      val isDev = variantName.contains("debug", ignoreCase = true)

      // Register bundle task for this variant
      val bundleTaskProvider = project.tasks.register(
        "graniteBundle$capitalizedVariantName",
        BundleTask::class.java,
      )

      bundleTaskProvider.configure {
        entryFile.set(extension.getEntryFileResolved())
        reactNativeDir.set(extension.reactNativeDir.get())
        nodeModulesDir.set(extension.nodeModulesDir.get())
        projectDir.set(project.layout.projectDirectory)

        // Output bundle file (always Hermes bytecode .hbc)
        val bundleName = extension.bundleAssetName.get()
        bundleFile.set(
          project.layout.buildDirectory.file(
            "generated/assets/$variantName/$bundleName.hbc",
          ),
        )

        // Source map file
        sourceMapFile.set(
          project.layout.buildDirectory.file(
            "generated/assets/$variantName/$bundleName.map",
          ),
        )

        bundleAssetName.set(extension.bundleAssetName.get())
        this.devMode.set(isDev)
        this.variantName.set(variantName)

        // Bundle task should run after codegen (will be configured in afterEvaluate)
        // mustRunAfter will be set up later when codegen task is registered
      }

      // Register asset packaging task for this variant
      val assetPackagingTaskProvider = project.tasks.register(
        "granitePackageAssets$capitalizedVariantName",
        AssetPackagingTask::class.java,
      )

      assetPackagingTaskProvider.configure {
        bundleFile.set(bundleTaskProvider.flatMap { it.bundleFile })

        // Assets directory (Metro generates this during bundling)
        assetsDir.set(
          project.layout.buildDirectory.dir("generated/assets/$variantName"),
        )

        // Output to variant-specific Android assets directory
        outputAssetsDir.set(
          project.layout.projectDirectory.dir("src/$variantName/assets"),
        )

        outputResDir.set(
          project.layout.projectDirectory.dir("src/$variantName/res"),
        )

        bundleAssetName.set(extension.bundleAssetName.get())
        compressionEnabled.set(extension.bundleCompressionEnabled.get())
        this.variantName.set(variantName)

        // NOTE: No automatic dependency on bundleTaskProvider
        // Users must manually run bundle tasks when needed:
        //   ./gradlew graniteBundle$capitalizedVariantName granitePackageAssets$capitalizedVariantName
      }

      // NOTE: Bundle and asset packaging tasks are decoupled from AAR build
      // This allows:
      //   1. Fast AAR builds without bundling (development)
      //   2. Manual bundle generation when needed (production)
      //   3. Flexibility for projects with JS in separate repositories
      //
      // To include bundles in AAR, manually run:
      //   ./gradlew graniteBundle$capitalizedVariantName granitePackageAssets$capitalizedVariantName bundle${capitalizedVariantName}Aar

      project.logger.debug("Registered bundle and asset tasks for variant: $variantName")
    }
  }

  /**
   * Configures bundle task dependencies after all tasks are registered.
   * Called from afterEvaluate to set up dependency relationships.
   */
  private fun configureBundleTaskDependencies(
    project: Project,
    codegenArtifactsTask: TaskProvider<CodegenArtifactsTask>,
  ) {
    // Find all bundle tasks and configure them to run after codegen
    project.tasks.withType(BundleTask::class.java).configureEach {
      mustRunAfter(codegenArtifactsTask)
    }

    project.logger.debug("Configured bundle task dependencies")
  }

  /**
   * Registers generated source directories at the DSL level using finalizeDsl.
   *
   * This ensures DSL-level source registration completes before variant processing,
   * making generated sources visible in IDE and local builds.
   *
   * Pattern from React Native Gradle Plugin reference implementation.
   */
  private fun registerGeneratedSourcesInDsl(
    project: Project,
    androidComponents: LibraryAndroidComponentsExtension,
  ) {
    androidComponents.finalizeDsl { extension ->
      // Register autolinking output
      val autolinkingDir = project.layout.buildDirectory.dir("generated/autolinking/src/main/java")
      extension.sourceSets.getByName("main").java.srcDir(autolinkingDir)

      // Register codegen output
      val codegenDir = project.layout.buildDirectory.dir("generated/codegen/java")
      extension.sourceSets.getByName("main").java.srcDir(codegenDir)

      project.logger.debug("Registered generated sources in DSL via finalizeDsl")
    }
  }

  /**
   * Registers generated source directories at the variant level using onVariants.
   *
   * This is CRITICAL for dependent module visibility. Dependent modules read
   * variant-level source configurations, not DSL-level.
   *
   * Uses addStaticSourceDirectory to register sources with each build variant,
   * ensuring they are visible to:
   * - Dependent modules during their configuration phase
   * - AAR metadata for library publication
   * - Android Studio IDE
   *
   * Pattern from React Native Gradle Plugin reference implementation.
   */
  private fun registerGeneratedSourcesInVariants(
    project: Project,
    androidComponents: LibraryAndroidComponentsExtension,
  ) {
    androidComponents.onVariants(androidComponents.selector().all()) { variant ->
      // Register autolinking sources at variant level
      val autolinkingDir = project.layout.buildDirectory
        .dir("generated/autolinking/src/main/java")
        .get()
        .asFile
        .absolutePath
      variant.sources.java?.addStaticSourceDirectory(autolinkingDir)

      // Register codegen sources at variant level
      val codegenDir = project.layout.buildDirectory
        .dir("generated/codegen/java")
        .get()
        .asFile
        .absolutePath
      variant.sources.java?.addStaticSourceDirectory(codegenDir)

      project.logger.debug("Registered generated sources for variant ${variant.name} via onVariants")
    }
  }

  /**
   * Runs react-native config command and parses the output.
   *
   * @param project The Gradle project
   * @param extension The Granite extension with configuration
   * @return Parsed autolinking configuration
   */
  private fun runReactNativeConfig(
    project: Project,
    extension: GraniteExtension,
  ): run.granite.gradle.models.AutolinkingConfig {
    val reactNativeDir: File = extension.reactNativeDir.get()
    val cliPath = File(reactNativeDir, "cli.js")

    if (!cliPath.exists()) {
      error(
        """
                |React Native CLI not found: ${cliPath.absolutePath}
                |
                |Solution: Run 'npm install' or 'yarn install' to install React Native
        """.trimMargin(),
      )
    }

    // Find node executable
    val nodeExecutable = NodeExecutableFinder.findNodeExecutable()

    // Execute: node path/to/react-native/cli.js config
    val command = listOf(
      nodeExecutable.absolutePath,
      cliPath.absolutePath,
      "config",
    )

    val stdout = ByteArrayOutputStream()
    val stderr = ByteArrayOutputStream()

    val result = project.exec {
      workingDir = project.projectDir
      commandLine = command
      standardOutput = stdout
      errorOutput = stderr
      isIgnoreExitValue = true
    }

    if (result.exitValue != 0) {
      error(
        """
                |Failed to execute react-native config command.
                |
                |Command: ${command.joinToString(" ")}
                |Exit code: ${result.exitValue}
                |Error output:
                |$stderr
        """.trimMargin(),
      )
    }

    val configJson = stdout.toString()

    // Parse configuration
    return try {
      AutolinkingParser.parse(configJson)
    } catch (e: IllegalArgumentException) {
      throw IllegalArgumentException(
        "react-native config: Failed to parse output. ${e.message}",
        e,
      )
    }
  }

  /**
   * Extracts Gradle dependency configuration pairs from autolinking config.
   *
   * @param config Autolinking configuration from react-native config
   * @return List of (configuration, projectPath) pairs
   */
  private fun getGradleDependenciesToApply(
    config: run.granite.gradle.models.AutolinkingConfig,
  ): List<Pair<String, String>> {
    val result = mutableListOf<Pair<String, String>>()

    config.androidDependencies()
      .filter { !it.isPureCxxDependency }
      .forEach { module ->
        // Remove @ prefix and replace / with _ to match settings.gradle project names
        // e.g., "@react-native-async-storage/async-storage" -> "react-native-async-storage_async-storage"
        val nameCleansed = module.name.removePrefix("@").replace("/", "_")
        val dependencyConfiguration = module.dependencyConfiguration ?: "api"
        val buildTypes = module.buildTypes

        if (buildTypes.isEmpty()) {
          // No build types specified - use base configuration
          result.add(dependencyConfiguration to ":$nameCleansed")
        } else {
          // Build type-specific dependencies
          buildTypes.forEach { buildType ->
            val config = "${buildType}${dependencyConfiguration.replaceFirstChar { it.uppercase() }}"
            result.add(config to ":$nameCleansed")
          }
        }
      }

    return result
  }

  /**
   * Programmatically adds Gradle project() dependencies for all autolinked native modules.
   *
   * Must be called in afterEvaluate block to ensure all subprojects are created.
   *
   * @param project The Gradle project where dependencies should be added
   * @param config Autolinking configuration from react-native config
   */
  private fun autolinkLibrariesWithApp(
    project: Project,
    config: run.granite.gradle.models.AutolinkingConfig,
  ) {
    val dependencies = getGradleDependenciesToApply(config)

    if (dependencies.isEmpty()) {
      project.logger.lifecycle("No autolinked dependencies to add")
      return
    }

    project.logger.lifecycle("Autolinking ${dependencies.size} native module dependencies...")

    var successCount = 0
    var failureCount = 0

    dependencies.forEach { (configuration, projectPath) ->
      // Validate project exists before adding dependency
      val foundProject = project.rootProject.findProject(projectPath)
      if (foundProject != null) {
        try {
          project.dependencies.add(
            configuration,
            project.dependencies.project(mapOf("path" to projectPath)),
          )
          project.logger.lifecycle("✓ Added dependency: $configuration '$projectPath'")
          successCount++
        } catch (e: Exception) {
          project.logger.error("✗ Failed to add dependency $configuration '$projectPath': ${e.message}")
          failureCount++
        }
      } else {
        project.logger.error("✗ Skipping autolink for $projectPath - project not found in settings.gradle")
        project.logger.debug("   Available projects: ${project.rootProject.subprojects.map { it.path }}")
        failureCount++
      }
    }

    project.logger.lifecycle("Autolinking complete. Added $successCount dependencies successfully${if (failureCount > 0) ", $failureCount failed" else ""}.")
  }
}
