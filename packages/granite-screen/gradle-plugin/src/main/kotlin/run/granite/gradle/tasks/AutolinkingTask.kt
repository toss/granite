package run.granite.gradle.tasks

import com.google.gson.Gson
import com.google.gson.JsonObject
import run.granite.gradle.generators.CMakeGenerator
import run.granite.gradle.generators.CppAutolinkingGenerator
import run.granite.gradle.generators.EntryPointGenerator
import run.granite.gradle.models.AutolinkingConfig
import run.granite.gradle.models.NativeModule
import run.granite.gradle.utils.AutolinkingParser
import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.*
import org.gradle.process.ExecOperations
import java.io.ByteArrayOutputStream
import java.io.File
import javax.inject.Inject

/**
 * Gradle task for React Native autolinking.
 *
 * This task:
 * 1. Executes `react-native config` command to discover native modules
 * 2. Parses the autolinking configuration JSON
 * 3. Generates PackageList.kt file with all discovered React Native packages
 *
 * The generated PackageList.kt is used by the React Native initialization code
 * to automatically register all native modules without manual configuration.
 *
 * Inputs:
 * - React Native CLI path
 * - Node modules directory
 * - Project root directory
 *
 * Outputs:
 * - PackageList.kt file in build/generated/autolinking/
 */
@CacheableTask
abstract class AutolinkingTask @Inject constructor(
    private val execOperations: ExecOperations
) : DefaultTask() {

    /**
     * React Native directory containing the CLI.
     * Marked as Internal to avoid task output overlaps with other modules.
     */
    @get:Internal
    abstract val reactNativeDir: DirectoryProperty

    /**
     * Node modules directory for dependency resolution.
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

    /**
     * Output directory for generated PackageList.kt.
     */
    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    /**
     * Generated PackageList.kt file.
     */
    @get:OutputFile
    abstract val packageListFile: RegularFileProperty

    /**
     * Package name for the generated PackageList class.
     */
    @get:Input
    abstract val packageName: Property<String>

    /**
     * Output directory for generated JNI autolinking files.
     */
    @get:OutputDirectory
    abstract val jniOutputDir: DirectoryProperty

    /**
     * Generated autolinking.h header file.
     */
    @get:OutputFile
    abstract val autolinkingHeaderFile: RegularFileProperty

    /**
     * Generated autolinking.cpp implementation file.
     */
    @get:OutputFile
    abstract val autolinkingCppFile: RegularFileProperty

    init {
        group = "granite"
        description = "Executes React Native autolinking and generates PackageList.kt"
    }

    @TaskAction
    fun execute() {
        logger.lifecycle("Running React Native autolinking...")

        // Execute react-native config once and reuse results
        val configJson = executeReactNativeConfig()

        // Parse configuration using AutolinkingParser
        val autolinkingConfig = try {
            AutolinkingParser.parse(configJson)
        } catch (e: IllegalArgumentException) {
            // Fail-fast with descriptive error message
            throw IllegalArgumentException(
                "react-native config: Failed to parse output. ${e.message}",
                e
            )
        }

        val modules = autolinkingConfig.androidDependencies()
        val javaModules = autolinkingConfig.javaModules()

        // Generate all autolinking files in a single task execution
        generatePackageList(javaModules)
        generateJniAutolinking(modules, autolinkingConfig)

        logger.lifecycle("Autolinking complete. Found ${modules.size} native modules (${javaModules.size} Java, ${autolinkingConfig.cxxModules().size} C++, ${autolinkingConfig.fabricModules().size} Fabric).")
    }

    /**
     * Executes `react-native config` command and returns the JSON output.
     *
     * Implementation details in corresponding task.
     */
    private fun executeReactNativeConfig(): String {
        val cliPath = reactNativeDir.get().file("cli.js").asFile
        val nodeExecutable = findNodeExecutable()

        if (!cliPath.exists()) {
            error(
                """
                |React Native CLI not found: ${cliPath.absolutePath}
                |
                |Solution: Run 'npm install' or 'yarn install' to install React Native
                """.trimMargin()
            )
        }

        // Execute: node path/to/react-native/cli.js config
        val command = listOf(
            nodeExecutable.absolutePath,
            cliPath.absolutePath,
            "config"
        )

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
            error(
                """
                |Failed to execute react-native config command.
                |
                |Command: ${command.joinToString(" ")}
                |Exit code: ${result.exitValue}
                |Error output:
                |${stderr.toString()}
                """.trimMargin()
            )
        }

        return stdout.toString()
    }

    /**
     * Interpolates dynamic values (BuildConfig, R) in package instances.
     * Replaces non-FQDN references with fully qualified package names.
     */
    private fun interpolateDynamicValues(input: String, pkgName: String): String =
        input.replace(Regex("([^.\\w])(BuildConfig|R)(\\W)")) { match ->
            val (prefix, className, suffix) = match.destructured
            "${prefix}${pkgName}.${className}${suffix}"
        }

    /**
     * Composes package import statements from native modules.
     * Filters out pure C++ dependencies.
     */
    private fun composePackageImports(modules: List<run.granite.gradle.models.NativeModule>): String {
        return modules
            .filter { !it.isPureCxxDependency }
            .mapNotNull { module ->
                module.packageImportPath?.let { importPath ->
                    val cleanImportPath = importPath
                        .removePrefix("import ")
                        .removeSuffix(";")
                        .trim()
                    interpolateDynamicValues("import $cleanImportPath;", packageName.get())
                }
            }
            .joinToString("\n")
    }

    /**
     * Composes package instance code for getPackages() method.
     * Filters out pure C++ dependencies.
     */
    private fun composePackageInstance(modules: List<run.granite.gradle.models.NativeModule>): String {
        return modules
            .filter { !it.isPureCxxDependency }
            .mapIndexed { index, module ->
                val instanceCode = interpolateDynamicValues(
                    module.packageInstance ?: "new UnknownPackage()",
                    packageName.get()
                )
                if (index == 0) ",\n      $instanceCode" else ",\n      $instanceCode"
            }
            .joinToString("")
    }

    /**
     * Generates PackageList.java file from discovered Java packages.
     */
    private fun generatePackageList(modules: List<run.granite.gradle.models.NativeModule>) {
        val outputFile = packageListFile.get().asFile
        outputFile.parentFile.mkdirs()

        val packageImports = composePackageImports(modules)
        val packageInstances = composePackageInstance(modules)

        val packageListContent = """
// Generated by Granite Gradle Plugin - DO NOT EDIT
// This file is automatically generated during the build process
package com.facebook.react;

import android.app.Application;
import android.content.Context;
import android.content.res.Resources;

import com.facebook.react.ReactPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.shell.MainPackageConfig;
import com.facebook.react.shell.MainReactPackage;
import java.util.Arrays;
import java.util.ArrayList;

$packageImports

@SuppressWarnings("deprecation")
public class PackageList {
  private Application application;
  private ReactNativeHost reactNativeHost;
  private MainPackageConfig mConfig;

  public PackageList(ReactNativeHost reactNativeHost) {
    this(reactNativeHost, null);
  }

  public PackageList(Application application) {
    this(application, null);
  }

  public PackageList(ReactNativeHost reactNativeHost, MainPackageConfig config) {
    this.reactNativeHost = reactNativeHost;
    mConfig = config;
  }

  public PackageList(Application application, MainPackageConfig config) {
    this.reactNativeHost = null;
    this.application = application;
    mConfig = config;
  }

  private ReactNativeHost getReactNativeHost() {
    return this.reactNativeHost;
  }

  private Resources getResources() {
    return this.getApplication().getResources();
  }

  private Application getApplication() {
    if (this.reactNativeHost == null) return this.application;
    return this.reactNativeHost.getApplication();
  }

  private Context getApplicationContext() {
    return this.getApplication().getApplicationContext();
  }

  public ArrayList<ReactPackage> getPackages() {
    return new ArrayList<>(Arrays.<ReactPackage>asList(
      new MainReactPackage(mConfig)$packageInstances
    ));
  }
}
""".trimIndent()

        outputFile.writeText(packageListContent)
        logger.lifecycle("Generated PackageList.java: ${outputFile.absolutePath}")
    }

    /**
     * Finds the Node.js executable.
     */
    private fun findNodeExecutable(): File {
        val nodeName = if (System.getProperty("os.name").startsWith("Windows")) {
            "node.exe"
        } else {
            "node"
        }

        // Try to find node in PATH
        val pathEnv = System.getenv("PATH") ?: ""
        val pathDirs = pathEnv.split(File.pathSeparator)

        for (dir in pathDirs) {
            val nodeFile = File(dir, nodeName)
            if (nodeFile.exists() && nodeFile.canExecute()) {
                return nodeFile
            }
        }

        // Fallback: assume node is in PATH and let the system resolve it
        return File(nodeName)
    }

    /**
     * Generates JNI autolinking files (autolinking.h, autolinking.cpp, Android-autolinking.cmake)
     * and Entry Point (ReactNativeApplicationEntryPoint.java).
     */
    private fun generateJniAutolinking(
        modules: List<NativeModule>,
        config: AutolinkingConfig
    ) {
        val jniDir = jniOutputDir.get().asFile
        val javaOutputDir = outputDir.get().asFile
        val projectRoot = projectDir.get().asFile

        // Generate autolinking.h (header with forward declarations)
        generateAutolinkingHeader(modules)

        // Generate autolinking.cpp using CppAutolinkingGenerator
        CppAutolinkingGenerator.generateToFile(modules, jniDir)
        logger.lifecycle("Generated autolinking.cpp with ${modules.filter { it.needsCppAutolinking }.size} modules")

        // Generate Android-autolinking.cmake using CMakeGenerator
        val cmakeModules = modules.filter { it.hasCMakeConfiguration }
        if (cmakeModules.isNotEmpty()) {
            CMakeGenerator.generateToFile(modules, projectRoot, jniDir)
            logger.lifecycle("Generated Android-autolinking.cmake with ${cmakeModules.size} CMake modules")
        } else {
            logger.lifecycle("Skipped Android-autolinking.cmake generation - no CMake modules found")
        }

        // Generate ReactNativeApplicationEntryPoint.java using EntryPointGenerator
        val packageName = config.project.android?.packageName
        try {
            EntryPointGenerator.generateToFile(packageName, javaOutputDir)
            logger.lifecycle("Generated ReactNativeApplicationEntryPoint.java")
        } catch (e: IllegalStateException) {
            // Package name validation error
            logger.warn("Skipped entry point generation: ${e.message}")
        }

        logger.lifecycle("Generated all autolinking files in: ${jniDir.absolutePath}")
    }

    /**
     * Generates autolinking.h header file with forward declarations.
     */
    private fun generateAutolinkingHeader(modules: List<run.granite.gradle.models.NativeModule>) {
        val headerFile = autolinkingHeaderFile.get().asFile
        headerFile.parentFile.mkdirs()

        val cxxModules = modules.filter { it.hasCxxImplementation }
        val javaModules = modules.filter { it.hasJavaImplementation }

        val headerContent = buildString {
            appendLine("// Generated by Granite Gradle Plugin - DO NOT EDIT")
            appendLine("// This file is automatically generated during the build process")
            appendLine()
            appendLine("#pragma once")
            appendLine()
            appendLine("#include <memory>")
            appendLine("#include <string>")
            appendLine()
            appendLine("#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>")
            appendLine("#include <react/bridging/Bridging.h>")
            appendLine("#include <ReactCommon/CallInvokerHolder.h>")
            appendLine("#include <ReactCommon/TurboModule.h>")
            appendLine("#include <ReactCommon/JavaTurboModule.h>")
            appendLine()
            appendLine("namespace facebook::react {")
            appendLine()

            // Forward declarations for C++ TurboModule providers
            if (cxxModules.isNotEmpty()) {
                appendLine("// Forward declarations for C++ TurboModule providers")
                cxxModules.forEach { module ->
                    module.cxxModuleHeaderName?.let { headerName ->
                        appendLine("class $headerName;")
                    }
                }
                appendLine()
            }

            // Forward declarations for Java TurboModule providers
            if (javaModules.isNotEmpty()) {
                appendLine("// Forward declarations for Java TurboModule providers")
                javaModules.forEach { module ->
                    module.libraryName?.let { libraryName ->
                        appendLine("std::shared_ptr<TurboModule> ${libraryName}_ModuleProvider(")
                        appendLine("    const std::string& moduleName,")
                        appendLine("    const JavaTurboModule::InitParams& params);")
                        appendLine()
                    }
                }
            }

            appendLine("/**")
            appendLine(" * Registers Fabric component providers from autolinked libraries.")
            appendLine(" */")
            appendLine("void autolinking_registerProviders(")
            appendLine("    std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);")
            appendLine()
            appendLine("/**")
            appendLine(" * Provides C++ TurboModule from autolinked libraries.")
            appendLine(" */")
            appendLine("std::shared_ptr<TurboModule> autolinking_cxxModuleProvider(")
            appendLine("    const std::string& name,")
            appendLine("    const std::shared_ptr<CallInvoker>& jsInvoker);")
            appendLine()
            appendLine("/**")
            appendLine(" * Provides Java TurboModule from autolinked libraries.")
            appendLine(" */")
            appendLine("std::shared_ptr<TurboModule> autolinking_ModuleProvider(")
            appendLine("    const std::string& name,")
            appendLine("    const JavaTurboModule::InitParams& params);")
            appendLine()
            appendLine("} // namespace facebook::react")
        }

        headerFile.writeText(headerContent)
        logger.debug("Generated autolinking.h: ${headerFile.absolutePath}")
    }
}
