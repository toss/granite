package run.granite.gradle.models

/**
 * Enriched model representing a React Native native module with computed properties.
 * This is the primary model used by code generators.
 *
 * Constructed from AndroidDependencyConfig with validation:
 * - packageImportPath and packageInstance must both be present or both be null
 */
data class NativeModule(
  val name: String,
  val packageImportPath: String?,
  val packageInstance: String?,
  val dependencyConfiguration: String?,
  val buildTypes: List<String>,
  val libraryName: String?,
  val componentDescriptors: List<String>,
  val cmakeListsPath: String?,
  val cxxModuleCMakeListsPath: String?,
  val cxxModuleCMakeListsModuleName: String?,
  val cxxModuleHeaderName: String?,
  val isPureCxxDependency: Boolean,
  /**
   * True if the module's package.json has codegenConfig.includesGeneratedCode: true.
   * Modules with this flag use their own codegen system (e.g., brick-codegen)
   * and should be excluded from react-native-codegen based autolinking.
   */
  val includesGeneratedCode: Boolean = false,
) {
  init {
    // Validate packageImportPath and packageInstance pairing
    val hasImportPath = packageImportPath != null
    val hasInstance = packageInstance != null
    require(hasImportPath == hasInstance) {
      "Module '$name': Failed to validate config - packageImportPath and packageInstance " +
        "must both be present or both be null. Check module's react-native.config.js."
    }
  }

  /**
   * True if module has Java TurboModule implementation.
   * Identified by non-null packageImportPath and packageInstance.
   */
  val hasJavaImplementation: Boolean
    get() = packageImportPath != null && packageInstance != null

  /**
   * True if module has C++ TurboModule implementation.
   * Identified by non-null cxxModuleHeaderName.
   */
  val hasCxxImplementation: Boolean
    get() = cxxModuleHeaderName != null

  /**
   * True if module has any Fabric components.
   * Identified by non-empty componentDescriptors array.
   */
  val hasFabricComponents: Boolean
    get() = componentDescriptors.isNotEmpty()

  /**
   * True if module has CMake configuration.
   * Identified by non-null cmakeListsPath or cxxModuleCMakeListsPath.
   */
  val hasCMakeConfiguration: Boolean
    get() = cmakeListsPath != null || cxxModuleCMakeListsPath != null

  /**
   * True if module needs to be included in C++ autolinking.
   * Required for C++ TurboModules or Fabric components.
   */
  val needsCppAutolinking: Boolean
    get() = hasCxxImplementation || hasFabricComponents

  /**
   * Returns C++ identifier-safe name by sanitizing module name.
   * Replaces invalid characters (spaces, hyphens, special chars) with underscores.
   */
  fun sanitizedName(): String = name.replace(Regex("[^a-zA-Z0-9_]"), "_")

  /**
   * Returns list of CMake entries for this module.
   * Handles both standard CMakeLists.txt and separate cxxModule CMakeLists.txt.
   */
  fun cmakeEntries(): List<CMakeEntry> {
    val entries = mutableListOf<CMakeEntry>()

    // Add standard CMakeLists.txt entry
    cmakeListsPath?.let { path ->
      entries.add(
        CMakeEntry(
          sourcePath = path,
          buildDirName = "${libraryName}_autolinked_build",
          libraryTargets = listOfNotNull(
            libraryName?.let { "react_codegen_$it" },
          ),
        ),
      )
    }

    // Add C++ TurboModule CMakeLists.txt entry
    cxxModuleCMakeListsPath?.let { path ->
      entries.add(
        CMakeEntry(
          sourcePath = path,
          buildDirName = "${libraryName}_cxx_autolinked_build",
          libraryTargets = listOfNotNull(cxxModuleCMakeListsModuleName),
        ),
      )
    }

    return entries
  }

  companion object {
    /**
     * Constructs NativeModule from AndroidDependencyConfig with validation.
     * Treats null and missing optional fields identically.
     *
     * @param name Module name
     * @param config Android dependency configuration
     * @param moduleRootPath Root path of the module (for reading package.json)
     */
    fun from(
      name: String,
      config: AndroidDependencyConfig,
      moduleRootPath: String? = null,
    ): NativeModule {
      val includesGeneratedCode = moduleRootPath?.let {
        readIncludesGeneratedCodeFlag(it)
      } ?: false

      return NativeModule(
        name = name,
        packageImportPath = config.packageImportPath,
        packageInstance = config.packageInstance,
        dependencyConfiguration = config.dependencyConfiguration,
        buildTypes = config.buildTypes.orEmpty(),
        libraryName = config.libraryName,
        componentDescriptors = config.componentDescriptors.orEmpty(),
        cmakeListsPath = config.cmakeListsPath,
        cxxModuleCMakeListsPath = config.cxxModuleCMakeListsPath,
        cxxModuleCMakeListsModuleName = config.cxxModuleCMakeListsModuleName,
        cxxModuleHeaderName = config.cxxModuleHeaderName,
        isPureCxxDependency = config.isPureCxxDependency ?: false,
        includesGeneratedCode = includesGeneratedCode,
      )
    }

    /**
     * Reads codegenConfig.includesGeneratedCode from module's package.json.
     * Returns false if the file doesn't exist or the flag is not set.
     */
    private fun readIncludesGeneratedCodeFlag(moduleRootPath: String): Boolean {
      return try {
        val packageJsonFile = java.io.File(moduleRootPath, "package.json")
        if (!packageJsonFile.exists()) return false

        val content = packageJsonFile.readText()
        val gson = com.google.gson.Gson()

        @Suppress("UNCHECKED_CAST")
        val json = gson.fromJson(content, Map::class.java) as? Map<String, Any>
          ?: return false

        @Suppress("UNCHECKED_CAST")
        val codegenConfig = json["codegenConfig"] as? Map<String, Any>
          ?: return false

        codegenConfig["includesGeneratedCode"] as? Boolean ?: false
      } catch (e: Exception) {
        // Fail gracefully - treat as false if we can't read the file
        false
      }
    }
  }
}
