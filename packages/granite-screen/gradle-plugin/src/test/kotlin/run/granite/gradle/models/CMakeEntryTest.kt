package run.granite.gradle.models

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * Unit tests for CMakeEntry core logic.
 * Tests path sanitization and CMake command generation.
 */
class CMakeEntryTest {

  @TempDir
  lateinit var tempDir: File

  @Test
  fun `sanitizedPath removes trailing CMakeLists txt`() {
    val entry = CMakeEntry(
      sourcePath = "android/CMakeLists.txt",
      buildDirName = "mylib_build",
      libraryTargets = listOf("react_codegen_mylib"),
    )

    val moduleRoot = File(tempDir, "mymodule")
    moduleRoot.mkdirs()
    File(moduleRoot, "android").mkdirs()

    val sanitized = entry.sanitizedPath(moduleRoot)

    // Should remove /CMakeLists.txt suffix
    assertThat(sanitized).endsWith("android")
    assertThat(sanitized).doesNotContain("CMakeLists.txt")
  }

  @Test
  fun `sanitizedPath removes trailing backslash CMakeLists txt`() {
    val entry = CMakeEntry(
      sourcePath = "android\\CMakeLists.txt",
      buildDirName = "mylib_build",
      libraryTargets = listOf("react_codegen_mylib"),
    )

    val moduleRoot = File(tempDir, "mymodule")
    moduleRoot.mkdirs()

    val sanitized = entry.sanitizedPath(moduleRoot)

    // Should remove \CMakeLists.txt suffix
    assertThat(sanitized).doesNotContain("CMakeLists.txt")
  }

  @Test
  fun `sanitizedPath converts backslashes to forward slashes`() {
    val entry = CMakeEntry(
      sourcePath = "android\\src\\main",
      buildDirName = "mylib_build",
      libraryTargets = listOf("react_codegen_mylib"),
    )

    val moduleRoot = File(tempDir, "mymodule")
    moduleRoot.mkdirs()

    val sanitized = entry.sanitizedPath(moduleRoot)

    // Should replace backslashes with forward slashes
    assertThat(sanitized).doesNotContain("\\")
    assertThat(sanitized).contains("/")
  }

  @Test
  fun `sanitizedPath converts relative to absolute path`() {
    val entry = CMakeEntry(
      sourcePath = "android",
      buildDirName = "mylib_build",
      libraryTargets = listOf("react_codegen_mylib"),
    )

    val moduleRoot = File(tempDir, "mymodule")
    moduleRoot.mkdirs()
    File(moduleRoot, "android").mkdirs()

    val sanitized = entry.sanitizedPath(moduleRoot)

    // Should be absolute path (canonicalPath resolves symlinks and may differ from absolutePath)
    assertThat(File(sanitized).isAbsolute).isTrue()
    assertThat(sanitized).contains("android")
  }

  @Test
  fun `sanitizedPath handles already absolute path`() {
    val absolutePath = File(tempDir, "absolute/path").absolutePath
    val entry = CMakeEntry(
      sourcePath = absolutePath,
      buildDirName = "mylib_build",
      libraryTargets = listOf("react_codegen_mylib"),
    )

    val moduleRoot = File(tempDir, "mymodule")
    val sanitized = entry.sanitizedPath(moduleRoot)

    // Should preserve absolute path (but canonicalize it)
    assertThat(File(sanitized).isAbsolute).isTrue
  }

  @Test
  fun `toCMakeCommand generates correct add_subdirectory command with existence check`() {
    val entry = CMakeEntry(
      sourcePath = "android",
      buildDirName = "mylib_autolinked_build",
      libraryTargets = listOf("react_codegen_mylib"),
    )

    val moduleRoot = File(tempDir, "mymodule")
    moduleRoot.mkdirs()
    File(moduleRoot, "android").mkdirs()

    val command = entry.toCMakeCommand(moduleRoot)

    // Should wrap with if(EXISTS ...) to handle clean scenarios
    assertThat(command).startsWith("if(EXISTS \"")
    assertThat(command).contains("add_subdirectory(\"")
    assertThat(command).contains("mylib_autolinked_build")
    assertThat(command).endsWith("endif()")
  }

  @Test
  fun `toCMakeCommand uses unique build directory name`() {
    val entry1 = CMakeEntry(
      sourcePath = "android",
      buildDirName = "lib1_autolinked_build",
      libraryTargets = listOf("react_codegen_lib1"),
    )

    val entry2 = CMakeEntry(
      sourcePath = "android",
      buildDirName = "lib2_autolinked_build",
      libraryTargets = listOf("react_codegen_lib2"),
    )

    val moduleRoot = File(tempDir, "mymodule")
    moduleRoot.mkdirs()
    File(moduleRoot, "android").mkdirs()

    val command1 = entry1.toCMakeCommand(moduleRoot)
    val command2 = entry2.toCMakeCommand(moduleRoot)

    // Build directory names should be unique
    assertThat(command1).contains("lib1_autolinked_build")
    assertThat(command2).contains("lib2_autolinked_build")
    assertThat(command1).isNotEqualTo(command2)
  }

  @Test
  fun `toCMakeCommand quotes path correctly`() {
    val entry = CMakeEntry(
      sourcePath = "android/path with spaces",
      buildDirName = "mylib_build",
      libraryTargets = listOf("react_codegen_mylib"),
    )

    val moduleRoot = File(tempDir, "mymodule")
    moduleRoot.mkdirs()
    File(moduleRoot, "android").mkdirs()

    val command = entry.toCMakeCommand(moduleRoot)

    // Path should be quoted in both if(EXISTS) and add_subdirectory
    assertThat(command).contains("if(EXISTS \"")
    assertThat(command).contains("add_subdirectory(\"")
  }

  @Test
  fun `libraryTargets can contain multiple targets`() {
    val entry = CMakeEntry(
      sourcePath = "android",
      buildDirName = "mylib_build",
      libraryTargets = listOf("react_codegen_mylib", "mylib_cxx", "mylib_fabric"),
    )

    // Should store all targets
    assertThat(entry.libraryTargets).hasSize(3)
    assertThat(entry.libraryTargets).containsExactly(
      "react_codegen_mylib",
      "mylib_cxx",
      "mylib_fabric",
    )
  }

  @Test
  fun `libraryTargets can be empty`() {
    val entry = CMakeEntry(
      sourcePath = "android",
      buildDirName = "mylib_build",
      libraryTargets = emptyList(),
    )

    assertThat(entry.libraryTargets).isEmpty()
  }
}
