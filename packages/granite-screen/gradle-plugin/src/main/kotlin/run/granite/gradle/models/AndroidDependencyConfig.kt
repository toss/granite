package run.granite.gradle.models

/**
 * Complete Android-specific configuration for a native module.
 * Maps directly to the "platforms.android" JSON structure from react-native config.
 *
 * All fields are nullable as they may be absent in the JSON configuration.
 * Missing fields are treated identically to null fields.
 */
data class AndroidDependencyConfig(
  val sourceDir: String?,
  val packageImportPath: String?,
  val packageInstance: String?,
  val dependencyConfiguration: String?,
  val buildTypes: List<String>?,
  val libraryName: String?,
  val componentDescriptors: List<String>?,
  val cmakeListsPath: String?,
  val cxxModuleCMakeListsPath: String?,
  val cxxModuleCMakeListsModuleName: String?,
  val cxxModuleHeaderName: String?,
  val isPureCxxDependency: Boolean?,
)
