package run.granite.gradle.fixtures

import run.granite.gradle.models.NativeModule

/**
 * Test fixtures for NativeModule instances.
 * Used for testing autolinking generation with various module configurations.
 */
object NativeModuleFixtures {

  /**
   * Creates a module with includesGeneratedCode: true.
   *
   * This represents the brick-module package with:
   * - libraryName: "BrickModuleSpec" (from package.json codegenConfig)
   * - Java TurboModule implementation
   * - No C++ implementation (Java only)
   * - PackageList integration
   * - includesGeneratedCode: true (uses brick-codegen instead of react-native-codegen)
   */
  fun createModuleWithCustomCodegen(): NativeModule = NativeModule(
    name = "custom-codegen-module",
    packageImportPath = "com.example.CustomCodegenPackage",
    packageInstance = "new CustomCodegenPackage()",
    dependencyConfiguration = null,
    buildTypes = emptyList(),
    libraryName = "CustomCodegenSpec",
    componentDescriptors = emptyList(),
    cmakeListsPath = "node_modules/custom-codegen-module/android/build/generated/source/codegen/jni/CMakeLists.txt",
    cxxModuleCMakeListsPath = null,
    cxxModuleCMakeListsModuleName = null,
    cxxModuleHeaderName = null,
    isPureCxxDependency = false,
    includesGeneratedCode = true, // brick-module uses brick-codegen
  )

  /**
   * Creates a standard module that uses react-native-codegen.
   *
   * This represents a typical React Native module that should be included in autolinking.
   */
  fun createStandardModule(): NativeModule = NativeModule(
    name = "react-native-example",
    packageImportPath = "com.example.ExamplePackage",
    packageInstance = "new ExamplePackage()",
    dependencyConfiguration = null,
    buildTypes = emptyList(),
    libraryName = "ExampleSpec",
    componentDescriptors = emptyList(),
    cmakeListsPath = "node_modules/react-native-example/android/build/generated/source/codegen/jni/CMakeLists.txt",
    cxxModuleCMakeListsPath = null,
    cxxModuleCMakeListsModuleName = null,
    cxxModuleHeaderName = null,
    isPureCxxDependency = false,
    includesGeneratedCode = false,
  )

  /**
   * Creates a list with both standard and custom codegen modules.
   *
   * Useful for testing filtering behavior.
   */
  fun createMixedModules(): List<NativeModule> = listOf(
    createModuleWithCustomCodegen(),
    createStandardModule(),
  )
}
