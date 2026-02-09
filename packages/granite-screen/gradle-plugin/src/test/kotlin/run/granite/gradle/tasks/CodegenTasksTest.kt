package run.granite.gradle.tasks

import com.google.gson.Gson
import com.google.gson.JsonObject
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import run.granite.gradle.utils.createTestFile
import run.granite.gradle.utils.createTestTask
import run.granite.gradle.utils.readFileContent
import java.io.File

/**
 * Unit tests for Codegen tasks (Schema and Artifacts).
 *
 * Tests schema generation and artifact generation for TurboModules and Fabric components.
 */
class CodegenTasksTest {

  @TempDir
  lateinit var tempDir: File

  // ========== CodegenSchemaTask Tests ==========

  @Test
  fun `CodegenSchemaTask is cacheable`() {
    val annotations = CodegenSchemaTask::class.annotations
    assertThat(annotations)
      .anyMatch { it.annotationClass.simpleName == "CacheableTask" }
  }

  @Test
  fun `CodegenSchemaTask has correct group and description`() {
    val task = createTestTask<CodegenSchemaTask>()

    assertThat(task.group).isEqualTo("granite")
    assertThat(task.description).isEqualTo("Scans JavaScript sources and generates React Native Codegen schema")
  }

  @Test
  fun `scanForSpecFiles finds TurboModule specs with Native prefix`() {
    // Create TurboModule spec files
    val jsSourceDir = File(tempDir, "src")
    createTestFile(jsSourceDir, "NativeSampleModule.js", "// TurboModule spec")
    createTestFile(jsSourceDir, "NativeTestModule.ts", "// TurboModule spec")
    createTestFile(jsSourceDir, "NativeExample.tsx", "// TurboModule spec")

    // Create non-spec files (should be ignored)
    createTestFile(jsSourceDir, "Component.js", "// Regular component")
    createTestFile(jsSourceDir, "utils.ts", "// Utility file")

    val outputDir = File(tempDir, "output")
    val schemaFile = File(outputDir, "schema.json")
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }

    val task = createTestTask<CodegenSchemaTask> {
      it.jsSourceDirs.set(listOf(jsSourceDir))
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.outputDir.set(outputDir)
      it.schemaFile.set(schemaFile)
    }

    task.execute()

    // Verify schema was generated
    assertThat(schemaFile).exists()

    val schema = Gson().fromJson(readFileContent(schemaFile), JsonObject::class.java)
    val modules = schema.getAsJsonObject("modules")

    // Should find 3 TurboModule specs
    assertThat(modules.has("NativeSampleModule")).isTrue
    assertThat(modules.has("NativeTestModule")).isTrue
    assertThat(modules.has("NativeExample")).isTrue

    // Should NOT find non-spec files
    assertThat(modules.has("Component")).isFalse
    assertThat(modules.has("utils")).isFalse
  }

  @Test
  fun `scanForSpecFiles finds Fabric component specs with NativeComponent suffix`() {
    // Create Fabric component spec files
    val jsSourceDir = File(tempDir, "src")
    createTestFile(jsSourceDir, "MyViewNativeComponent.js", "// Fabric component")
    createTestFile(jsSourceDir, "CustomButtonNativeComponent.ts", "// Fabric component")

    val outputDir = File(tempDir, "output")
    val schemaFile = File(outputDir, "schema.json")
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }

    val task = createTestTask<CodegenSchemaTask> {
      it.jsSourceDirs.set(listOf(jsSourceDir))
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.outputDir.set(outputDir)
      it.schemaFile.set(schemaFile)
    }

    task.execute()

    val schema = Gson().fromJson(readFileContent(schemaFile), JsonObject::class.java)
    val modules = schema.getAsJsonObject("modules")

    assertThat(modules.has("MyViewNativeComponent")).isTrue
    assertThat(modules.has("CustomButtonNativeComponent")).isTrue
  }

  @Test
  fun `scanForSpecFiles handles nested directory structure`() {
    // Create nested directory structure
    val jsSourceDir = File(tempDir, "src")
    createTestFile(File(jsSourceDir, "modules/auth"), "NativeAuthModule.ts", "// Auth module")
    createTestFile(File(jsSourceDir, "components/views"), "ImageViewNativeComponent.js", "// Image view")
    createTestFile(File(jsSourceDir, "deep/nested/path"), "NativeUtilsModule.tsx", "// Utils")

    val outputDir = File(tempDir, "output")
    val schemaFile = File(outputDir, "schema.json")
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }

    val task = createTestTask<CodegenSchemaTask> {
      it.jsSourceDirs.set(listOf(jsSourceDir))
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.outputDir.set(outputDir)
      it.schemaFile.set(schemaFile)
    }

    task.execute()

    val schema = Gson().fromJson(readFileContent(schemaFile), JsonObject::class.java)
    val modules = schema.getAsJsonObject("modules")

    // Should find all nested spec files
    assertThat(modules.has("NativeAuthModule")).isTrue
    assertThat(modules.has("ImageViewNativeComponent")).isTrue
    assertThat(modules.has("NativeUtilsModule")).isTrue
  }

  @Test
  fun `scanForSpecFiles handles multiple source directories`() {
    // Create multiple source directories
    val srcDir1 = File(tempDir, "src1")
    val srcDir2 = File(tempDir, "src2")
    val srcDir3 = File(tempDir, "src3")

    createTestFile(srcDir1, "NativeModule1.js", "// Module 1")
    createTestFile(srcDir2, "NativeModule2.ts", "// Module 2")
    createTestFile(srcDir3, "NativeModule3.tsx", "// Module 3")

    val outputDir = File(tempDir, "output")
    val schemaFile = File(outputDir, "schema.json")
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }

    val task = createTestTask<CodegenSchemaTask> {
      it.jsSourceDirs.set(listOf(srcDir1, srcDir2, srcDir3))
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.outputDir.set(outputDir)
      it.schemaFile.set(schemaFile)
    }

    task.execute()

    val schema = Gson().fromJson(readFileContent(schemaFile), JsonObject::class.java)
    val modules = schema.getAsJsonObject("modules")

    // Should find modules from all source directories
    assertThat(modules.size()).isEqualTo(3)
    assertThat(modules.has("NativeModule1")).isTrue
    assertThat(modules.has("NativeModule2")).isTrue
    assertThat(modules.has("NativeModule3")).isTrue
  }

  @Test
  fun `generateSchema creates empty schema when no spec files found`() {
    // Create empty source directory
    val jsSourceDir = File(tempDir, "src").apply { mkdirs() }
    createTestFile(jsSourceDir, "Component.js", "// Regular component")
    createTestFile(jsSourceDir, "utils.ts", "// Utils")

    val outputDir = File(tempDir, "output")
    val schemaFile = File(outputDir, "schema.json")
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }

    val task = createTestTask<CodegenSchemaTask> {
      it.jsSourceDirs.set(listOf(jsSourceDir))
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.outputDir.set(outputDir)
      it.schemaFile.set(schemaFile)
    }

    task.execute()

    // Should create empty schema
    assertThat(schemaFile).exists()

    val schema = Gson().fromJson(readFileContent(schemaFile), JsonObject::class.java)
    assertThat(schema.has("version")).isTrue
    assertThat(schema.has("modules")).isTrue

    val modules = schema.getAsJsonObject("modules")
    assertThat(modules.size()).isEqualTo(0)
  }

  @Test
  fun `generateSchema includes version and module metadata`() {
    val jsSourceDir = File(tempDir, "src")
    createTestFile(jsSourceDir, "NativeSampleModule.ts", "// TurboModule")

    val outputDir = File(tempDir, "output")
    val schemaFile = File(outputDir, "schema.json")
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }

    val task = createTestTask<CodegenSchemaTask> {
      it.jsSourceDirs.set(listOf(jsSourceDir))
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.outputDir.set(outputDir)
      it.schemaFile.set(schemaFile)
    }

    task.execute()

    val schema = Gson().fromJson(readFileContent(schemaFile), JsonObject::class.java)

    // Verify version
    assertThat(schema.has("version")).isTrue
    assertThat(schema.get("version").asString).isEqualTo("0.81.0")

    // Verify module structure
    val modules = schema.getAsJsonObject("modules")
    val sampleModule = modules.getAsJsonObject("NativeSampleModule")

    assertThat(sampleModule.get("type").asString).isEqualTo("NativeModule")
    assertThat(sampleModule.has("spec")).isTrue
  }

  @Test
  fun `generateSchema supports all JavaScript file extensions`() {
    val jsSourceDir = File(tempDir, "src")
    createTestFile(jsSourceDir, "NativeModule1.js", "// .js")
    createTestFile(jsSourceDir, "NativeModule2.ts", "// .ts")
    createTestFile(jsSourceDir, "NativeModule3.jsx", "// .jsx")
    createTestFile(jsSourceDir, "NativeModule4.tsx", "// .tsx")

    val outputDir = File(tempDir, "output")
    val schemaFile = File(outputDir, "schema.json")
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }

    val task = createTestTask<CodegenSchemaTask> {
      it.jsSourceDirs.set(listOf(jsSourceDir))
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.outputDir.set(outputDir)
      it.schemaFile.set(schemaFile)
    }

    task.execute()

    val schema = Gson().fromJson(readFileContent(schemaFile), JsonObject::class.java)
    val modules = schema.getAsJsonObject("modules")

    // All file extensions should be supported
    assertThat(modules.size()).isEqualTo(4)
    assertThat(modules.has("NativeModule1")).isTrue
    assertThat(modules.has("NativeModule2")).isTrue
    assertThat(modules.has("NativeModule3")).isTrue
    assertThat(modules.has("NativeModule4")).isTrue
  }

  @Test
  fun `schema file is valid JSON`() {
    val jsSourceDir = File(tempDir, "src")
    createTestFile(jsSourceDir, "NativeTestModule.ts", "// Test")

    val outputDir = File(tempDir, "output")
    val schemaFile = File(outputDir, "schema.json")
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }

    val task = createTestTask<CodegenSchemaTask> {
      it.jsSourceDirs.set(listOf(jsSourceDir))
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.outputDir.set(outputDir)
      it.schemaFile.set(schemaFile)
    }

    task.execute()

    // Should be parseable as JSON
    val content = readFileContent(schemaFile)
    val schema = Gson().fromJson(content, JsonObject::class.java)

    assertThat(schema).isNotNull
    assertThat(schema.isJsonObject).isTrue
  }

  // ========== CodegenArtifactsTask Tests ==========

  @Test
  fun `CodegenArtifactsTask is cacheable`() {
    val annotations = CodegenArtifactsTask::class.annotations
    assertThat(annotations)
      .anyMatch { it.annotationClass.simpleName == "CacheableTask" }
  }

  @Test
  fun `CodegenArtifactsTask has correct group and description`() {
    val task = createTestTask<CodegenArtifactsTask>()

    assertThat(task.group).isEqualTo("granite")
    assertThat(task.description).isEqualTo("Generates React Native Codegen artifacts (Java and C++)")
  }

  @Test
  fun `CodegenArtifactsTask creates output directories when codegen binary not found`() {
    // Create empty schema
    val schemaContent = """{"version":"0.81.0","modules":{}}"""
    val schemaFile = createTestFile(tempDir, "schema.json", schemaContent)

    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }
    val javaOutputDir = File(tempDir, "output/java")
    val jniOutputDir = File(tempDir, "output/jni")

    val task = createTestTask<CodegenArtifactsTask> {
      it.schemaFile.set(schemaFile)
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.packageName.set("com.example.test")
      it.libraryName.set("TestLibrary")
      it.javaOutputDir.set(javaOutputDir)
      it.jniOutputDir.set(jniOutputDir)
    }

    // Execute (will not find codegen binary but should not fail)
    task.execute()

    // Output directories should be created even when codegen binary is not found
    assertThat(javaOutputDir).exists()
    assertThat(jniOutputDir).exists()
  }

  @Test
  fun `CodegenArtifactsTask uses package name property`() {
    val task = createTestTask<CodegenArtifactsTask> {
      it.packageName.set("com.custom.package")
    }

    assertThat(task.packageName.get()).isEqualTo("com.custom.package")
  }

  @Test
  fun `CodegenArtifactsTask uses library name property`() {
    val task = createTestTask<CodegenArtifactsTask> {
      it.libraryName.set("MyNativeLibrary")
    }

    assertThat(task.libraryName.get()).isEqualTo("MyNativeLibrary")
  }

  @Test
  fun `CodegenArtifactsTask handles valid schema file`() {
    // Create a schema with modules
    val schemaContent = """
        {
          "version": "0.81.0",
          "modules": {
            "NativeTestModule": {
              "type": "NativeModule",
              "spec": "/path/to/spec"
            }
          }
        }
    """.trimIndent()

    val schemaFile = createTestFile(tempDir, "schema.json", schemaContent)
    val reactNativeDir = File(tempDir, "react-native").apply { mkdirs() }
    val nodeModulesDir = File(tempDir, "node_modules").apply { mkdirs() }
    val javaOutputDir = File(tempDir, "output/java")
    val jniOutputDir = File(tempDir, "output/jni")

    val task = createTestTask<CodegenArtifactsTask> {
      it.schemaFile.set(schemaFile)
      it.reactNativeDir.set(reactNativeDir)
      it.nodeModulesDir.set(nodeModulesDir)
      it.packageName.set("com.example.test")
      it.libraryName.set("TestLibrary")
      it.javaOutputDir.set(javaOutputDir)
      it.jniOutputDir.set(jniOutputDir)
    }

    // Should not throw (will warn about missing codegen binary but continue)
    task.execute()

    assertThat(javaOutputDir).exists()
    assertThat(jniOutputDir).exists()
  }
}
