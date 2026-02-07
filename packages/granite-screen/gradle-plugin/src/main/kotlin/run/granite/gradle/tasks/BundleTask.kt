package run.granite.gradle.tasks

import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.*
import org.gradle.process.ExecOperations
import run.granite.gradle.utils.NodeExecutableFinder
import java.io.ByteArrayOutputStream
import java.io.File
import javax.inject.Inject

/**
 * Gradle task for generating React Native JavaScript bundles.
 *
 * This task:
 * 1. Executes Metro bundler to bundle JavaScript code
 * 2. Compiles the bundle to Hermes bytecode (always enabled)
 * 3. Handles dev vs release build configurations
 * 4. Generates source maps for debugging
 */
@CacheableTask
abstract class BundleTask @Inject constructor(
  private val execOperations: ExecOperations,
) : DefaultTask() {

  @get:InputFile
  @get:PathSensitive(PathSensitivity.RELATIVE)
  abstract val entryFile: RegularFileProperty

  /**
   * React Native directory.
   * Marked as Internal to avoid task output overlaps with other modules.
   */
  @get:Internal
  abstract val reactNativeDir: DirectoryProperty

  /**
   * Node modules directory.
   * Marked as Internal to avoid task output overlaps with other modules.
   */
  @get:Internal
  abstract val nodeModulesDir: DirectoryProperty

  /**
   * Project root directory.
   * Marked as Internal to avoid task output overlaps with other modules.
   */
  @get:Internal
  abstract val projectDir: DirectoryProperty

  @get:OutputFile
  abstract val bundleFile: RegularFileProperty

  @get:OutputFile
  abstract val sourceMapFile: RegularFileProperty

  @get:Input
  abstract val bundleAssetName: Property<String>

  @get:Input
  abstract val devMode: Property<Boolean>

  @get:Input
  abstract val variantName: Property<String>

  init {
    group = "granite"
    description = "Generates React Native JavaScript bundle"
  }

  @TaskAction
  fun execute() {
    val variant = variantName.get()
    logger.lifecycle("Bundling JavaScript for variant: $variant")

    // Validate entry file exists at execution time
    // This allows flexibility for projects with JS in separate repos during development
    val entryFileResolved = entryFile.get().asFile
    if (!entryFileResolved.exists()) {
      error(
        """
                |JavaScript entry file not found: ${entryFileResolved.absolutePath}
                |
                |The entry file is required for bundle generation but was not found.
                |This typically occurs when:
                |  1. JavaScript source files are in a separate repository
                |  2. The entry file path is incorrectly configured
                |  3. Build is running before JS files are available
                |
                |Solutions:
                |  1. Ensure JavaScript files are available before running release builds
                |  2. Configure the correct entry file path in build.gradle.kts:
                |     granite {
                |         entryFile.set("path/to/index.js")
                |     }
                |  3. For development, use Metro dev server instead of bundling
                |
                |Variant: $variant
        """.trimMargin(),
      )
    }

    val jsBundleFile = generateJavaScriptBundle()

    // Always compile to Hermes bytecode (JSC not supported)
    compileToHermes(jsBundleFile)

    logger.lifecycle("Bundle generation complete for variant: $variant")
  }

  private fun generateJavaScriptBundle(): File {
    logger.lifecycle("Running Metro bundler...")

    val cliPath = reactNativeDir.get().file("cli.js").asFile
    val nodeExecutable = NodeExecutableFinder.findNodeExecutable()

    if (!cliPath.exists()) {
      error("React Native CLI not found: ${cliPath.absolutePath}")
    }

    val tempJsBundle = File(bundleFile.get().asFile.parentFile, "temp_${bundleAssetName.get()}")
    tempJsBundle.parentFile.mkdirs()

    val command = buildList {
      add(nodeExecutable.absolutePath)
      add(cliPath.absolutePath)
      add("bundle")
      add("--platform")
      add("android")
      add("--entry-file")
      add(entryFile.get().asFile.absolutePath)
      add("--bundle-output")
      add(tempJsBundle.absolutePath)
      add("--sourcemap-output")
      add(sourceMapFile.get().asFile.absolutePath)
      add("--assets-dest")
      add(bundleFile.get().asFile.parentFile.absolutePath)

      if (devMode.get()) {
        add("--dev")
        add("true")
      } else {
        add("--dev")
        add("false")
        add("--minify")
        add("true")
      }
    }

    val stdout = ByteArrayOutputStream()
    val stderr = ByteArrayOutputStream()

    val result = execOperations.exec {
      workingDir = projectDir.get().asFile
      commandLine = command
      standardOutput = stdout
      errorOutput = stderr
      isIgnoreExitValue = true
    }

    if (result.exitValue != 0) {
      error("Failed to bundle JavaScript. Exit code: ${result.exitValue}\n$stderr")
    }

    logger.lifecycle("Metro bundling complete: ${tempJsBundle.absolutePath}")
    return tempJsBundle
  }

  private fun compileToHermes(jsBundleFile: File) {
    logger.lifecycle("Compiling to Hermes bytecode...")

    val hermesExecutable = findHermesCompiler()

    val command = listOf(
      hermesExecutable.absolutePath,
      "-emit-binary",
      "-out",
      bundleFile.get().asFile.absolutePath,
      jsBundleFile.absolutePath,
    )

    val stdout = ByteArrayOutputStream()
    val stderr = ByteArrayOutputStream()

    val result = execOperations.exec {
      commandLine = command
      standardOutput = stdout
      errorOutput = stderr
      isIgnoreExitValue = true
    }

    if (result.exitValue != 0) {
      error("Failed to compile to Hermes bytecode. Exit code: ${result.exitValue}\n$stderr")
    }

    jsBundleFile.delete()

    logger.lifecycle("Hermes compilation complete: ${bundleFile.get().asFile.absolutePath}")
  }

  private fun findHermesCompiler(): File {
    // Determine OS-specific binary directory
    val osBinDir = when {
      System.getProperty("os.name").startsWith("Windows") -> "win64-bin"
      System.getProperty("os.name").startsWith("Mac") -> "osx-bin"
      else -> "linux64-bin"
    }
    val hermescName = if (osBinDir == "win64-bin") "hermesc.exe" else "hermesc"

    val nodeModules = nodeModulesDir.get().asFile

    // 1. Check known paths in hermes-engine package
    val hermesEnginePaths = listOf(
      File(nodeModules, "hermes-engine/$osBinDir/$hermescName"),
      File(nodeModules, "hermes-engine/bin/$hermescName"),
    )

    for (path in hermesEnginePaths) {
      if (path.exists() && path.canExecute()) {
        return path
      }
    }

    // 2. Check known paths in react-native SDKs
    val reactNativeSdkPaths = listOf(
      File(nodeModules, "react-native/sdks/hermesc/$osBinDir/$hermescName"),
      File(nodeModules, "react-native/sdks/hermes/$osBinDir/$hermescName"),
    )

    for (path in reactNativeSdkPaths) {
      if (path.exists() && path.canExecute()) {
        return path
      }
    }

    // 3. Check react-native/android Maven cache (original location)
    val reactNativeAndroid = File(reactNativeDir.get().asFile, "android")
    val hermesEngine = File(reactNativeAndroid, "com/facebook/react/hermes-engine")

    if (hermesEngine.exists()) {
      val hermescExecutables = hermesEngine.walk()
        .filter { it.name == hermescName }
        .filter { it.canExecute() }
        .toList()

      if (hermescExecutables.isNotEmpty()) {
        return hermescExecutables.first()
      }
    }

    // 4. Fallback: targeted search in specific subdirectories only
    val targetedDirs = listOf(
      File(nodeModules, "hermes-engine"),
      File(nodeModules, "react-native/sdks"),
    )

    for (dir in targetedDirs) {
      if (dir.exists()) {
        val found = dir.walk()
          .maxDepth(5) // Limit depth to prevent excessive traversal
          .filter { it.name == hermescName }
          .filter { it.canExecute() }
          .firstOrNull()

        if (found != null) {
          return found
        }
      }
    }

    error("Hermes compiler (hermesc) not found. Searched paths: ${hermesEnginePaths + reactNativeSdkPaths}")
  }
}
