package run.granite.gradle.models

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

/**
 * Unit tests for NativeModule core logic.
 * Tests validation, computed properties, and CMake entry generation.
 */
class NativeModuleTest {

  @Test
  fun `validates packageImportPath and packageInstance must both be present`() {
    // Both present - should succeed
    val module = NativeModule(
      name = "test-module",
      packageImportPath = "com.example.TestPackage",
      packageInstance = "new TestPackage()",
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.packageImportPath).isEqualTo("com.example.TestPackage")
    assertThat(module.packageInstance).isEqualTo("new TestPackage()")
  }

  @Test
  fun `validates packageImportPath and packageInstance must both be null`() {
    // Both null - should succeed
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.packageImportPath).isNull()
    assertThat(module.packageInstance).isNull()
  }

  @Test
  fun `throws IllegalArgumentException when packageImportPath present but packageInstance null`() {
    // Violation - should fail
    assertThatThrownBy {
      NativeModule(
        name = "test-module",
        packageImportPath = "com.example.TestPackage",
        packageInstance = null,
        dependencyConfiguration = null,
        buildTypes = emptyList(),
        libraryName = "testlib",
        componentDescriptors = emptyList(),
        cmakeListsPath = null,
        cxxModuleCMakeListsPath = null,
        cxxModuleCMakeListsModuleName = null,
        cxxModuleHeaderName = null,
        isPureCxxDependency = false,
      )
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("test-module")
      .hasMessageContaining("packageImportPath and packageInstance")
      .hasMessageContaining("both be present or both be null")
  }

  @Test
  fun `throws IllegalArgumentException when packageInstance present but packageImportPath null`() {
    // Violation - should fail
    assertThatThrownBy {
      NativeModule(
        name = "test-module",
        packageImportPath = null,
        packageInstance = "new TestPackage()",
        dependencyConfiguration = null,
        buildTypes = emptyList(),
        libraryName = "testlib",
        componentDescriptors = emptyList(),
        cmakeListsPath = null,
        cxxModuleCMakeListsPath = null,
        cxxModuleCMakeListsModuleName = null,
        cxxModuleHeaderName = null,
        isPureCxxDependency = false,
      )
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("test-module")
  }

  @Test
  fun `hasJavaImplementation returns true when both packageImportPath and packageInstance present`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = "com.example.TestPackage",
      packageInstance = "new TestPackage()",
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.hasJavaImplementation).isTrue
  }

  @Test
  fun `hasJavaImplementation returns false when both are null`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.hasJavaImplementation).isFalse
  }

  @Test
  fun `hasCxxImplementation returns true when cxxModuleHeaderName present`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = "TestModule",
      isPureCxxDependency = true,
    )

    assertThat(module.hasCxxImplementation).isTrue
  }

  @Test
  fun `hasCxxImplementation returns false when cxxModuleHeaderName null`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.hasCxxImplementation).isFalse
  }

  @Test
  fun `hasFabricComponents returns true when componentDescriptors not empty`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = listOf("MyComponent", "AnotherComponent"),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.hasFabricComponents).isTrue
  }

  @Test
  fun `hasFabricComponents returns false when componentDescriptors empty`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.hasFabricComponents).isFalse
  }

  @Test
  fun `hasCMakeConfiguration returns true when cmakeListsPath present`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = "android/CMakeLists.txt",
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.hasCMakeConfiguration).isTrue
  }

  @Test
  fun `hasCMakeConfiguration returns true when cxxModuleCMakeListsPath present`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = "android/cxx/CMakeLists.txt",
      cxxModuleCMakeListsModuleName = "testmodule_cxx",
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.hasCMakeConfiguration).isTrue
  }

  @Test
  fun `hasCMakeConfiguration returns false when both paths null`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.hasCMakeConfiguration).isFalse
  }

  @Test
  fun `needsCppAutolinking returns true when hasCxxImplementation`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = "TestModule",
      isPureCxxDependency = true,
    )

    assertThat(module.needsCppAutolinking).isTrue
  }

  @Test
  fun `needsCppAutolinking returns true when hasFabricComponents`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = listOf("MyComponent"),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.needsCppAutolinking).isTrue
  }

  @Test
  fun `needsCppAutolinking returns false when neither C++ nor Fabric`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = "com.example.TestPackage",
      packageInstance = "new TestPackage()",
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.needsCppAutolinking).isFalse
  }

  @Test
  fun `sanitizedName replaces spaces with underscores`() {
    // / C++ identifier sanitization
    val module = NativeModule(
      name = "my test module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.sanitizedName()).isEqualTo("my_test_module")
  }

  @Test
  fun `sanitizedName replaces hyphens with underscores`() {
    // C++ identifier sanitization
    val module = NativeModule(
      name = "react-native-webview",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.sanitizedName()).isEqualTo("react_native_webview")
  }

  @Test
  fun `sanitizedName replaces special characters with underscores`() {
    // C++ identifier sanitization
    val module = NativeModule(
      name = "module@2.0-beta!",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    assertThat(module.sanitizedName()).isEqualTo("module_2_0_beta_")
  }

  @Test
  fun `cmakeEntries returns empty list when no CMake configuration`() {
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    val entries = module.cmakeEntries()

    assertThat(entries).isEmpty()
  }

  @Test
  fun `cmakeEntries returns one entry when only standard CMakeLists txt`() {
    // Handle standard CMakeLists.txt
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = "android/CMakeLists.txt",
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    val entries = module.cmakeEntries()

    assertThat(entries).hasSize(1)
    assertThat(entries[0].sourcePath).isEqualTo("android/CMakeLists.txt")
    assertThat(entries[0].buildDirName).isEqualTo("testlib_autolinked_build")
    assertThat(entries[0].libraryTargets).containsExactly("react_codegen_testlib")
  }

  @Test
  fun `cmakeEntries returns one entry when only cxxModule CMakeLists txt`() {
    // Handle cxxModule CMakeLists.txt
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = "android/cxx/CMakeLists.txt",
      cxxModuleCMakeListsModuleName = "testmodule_cxx",
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    val entries = module.cmakeEntries()

    assertThat(entries).hasSize(1)
    assertThat(entries[0].sourcePath).isEqualTo("android/cxx/CMakeLists.txt")
    assertThat(entries[0].buildDirName).isEqualTo("testlib_cxx_autolinked_build")
    assertThat(entries[0].libraryTargets).containsExactly("testmodule_cxx")
  }

  @Test
  fun `cmakeEntries returns two entries when both CMakeLists txt present`() {
    // Handle both standard and cxxModule CMakeLists.txt
    val module = NativeModule(
      name = "test-module",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = emptyList(),
      libraryName = "testlib",
      componentDescriptors = emptyList(),
      cmakeListsPath = "android/CMakeLists.txt",
      cxxModuleCMakeListsPath = "android/cxx/CMakeLists.txt",
      cxxModuleCMakeListsModuleName = "testmodule_cxx",
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    val entries = module.cmakeEntries()

    assertThat(entries).hasSize(2)
    // First entry: standard CMakeLists.txt
    assertThat(entries[0].sourcePath).isEqualTo("android/CMakeLists.txt")
    assertThat(entries[0].buildDirName).isEqualTo("testlib_autolinked_build")
    // Second entry: cxxModule CMakeLists.txt
    assertThat(entries[1].sourcePath).isEqualTo("android/cxx/CMakeLists.txt")
    assertThat(entries[1].buildDirName).isEqualTo("testlib_cxx_autolinked_build")
  }

  @Test
  fun `from factory method creates module from AndroidDependencyConfig`() {
    // Treat null and missing fields identically
    val config = AndroidDependencyConfig(
      sourceDir = "android",
      packageImportPath = "com.example.TestPackage",
      packageInstance = "new TestPackage()",
      dependencyConfiguration = null,
      buildTypes = listOf("debug", "release"),
      libraryName = "testlib",
      componentDescriptors = listOf("MyComponent"),
      cmakeListsPath = "android/CMakeLists.txt",
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = null, // null treated as false
    )

    val module = NativeModule.from("test-module", config)

    assertThat(module.name).isEqualTo("test-module")
    assertThat(module.packageImportPath).isEqualTo("com.example.TestPackage")
    assertThat(module.packageInstance).isEqualTo("new TestPackage()")
    assertThat(module.libraryName).isEqualTo("testlib")
    assertThat(module.componentDescriptors).containsExactly("MyComponent")
    assertThat(module.cmakeListsPath).isEqualTo("android/CMakeLists.txt")
    assertThat(module.isPureCxxDependency).isFalse // null becomes false
  }

  @Test
  fun `from factory method treats null componentDescriptors as empty list`() {
    // Null treated as absent
    val config = AndroidDependencyConfig(
      sourceDir = "android",
      packageImportPath = null,
      packageInstance = null,
      dependencyConfiguration = null,
      buildTypes = null,
      libraryName = "testlib",
      componentDescriptors = null, // null
      cmakeListsPath = null,
      cxxModuleCMakeListsPath = null,
      cxxModuleCMakeListsModuleName = null,
      cxxModuleHeaderName = null,
      isPureCxxDependency = false,
    )

    val module = NativeModule.from("test-module", config)

    assertThat(module.componentDescriptors).isEmpty()
  }
}
