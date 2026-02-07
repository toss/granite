package run.granite.gradle.tasks

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import run.granite.gradle.utils.createTestFile
import run.granite.gradle.utils.createTestTask
import run.granite.gradle.utils.readFileContent
import java.io.File
import java.util.zip.GZIPInputStream

/**
 * Unit tests for AssetPackagingTask.
 *
 * Tests asset packaging and compression logic by executing the actual task.
 */
class AssetPackagingTaskTest {

  @TempDir
  lateinit var tempDir: File

  @Test
  fun `task is cacheable`() {
    val annotations = AssetPackagingTask::class.annotations
    assertThat(annotations)
      .anyMatch { it.annotationClass.simpleName == "CacheableTask" }
  }

  @Test
  fun `task has correct group and description`() {
    val task = createTestTask<AssetPackagingTask>()

    assertThat(task.group).isEqualTo("granite")
    assertThat(task.description).isEqualTo("Packages React Native assets and bundles")
  }

  @Test
  fun `packageBundle copies uncompressed bundle when compression disabled`() {
    // Create test bundle file
    val bundleContent = "// React Native bundle\nvar __BUNDLE_START_TIME__=Date.now();"
    val bundleFile = createTestFile(tempDir, "index.android.bundle", bundleContent)

    val outputDir = File(tempDir, "output/assets")
    val outputFile = File(outputDir, "index.android.bundle")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.outputAssetsDir.set(outputDir)
      it.bundleAssetName.set("index.android.bundle")
      it.compressionEnabled.set(false)
      it.variantName.set("release")
    }

    task.execute()

    // Verify uncompressed bundle was copied
    assertThat(outputFile).exists()
    assertThat(readFileContent(outputFile)).isEqualTo(bundleContent)

    // Verify no gzipped file was created
    assertThat(File(outputDir, "index.android.bundle.gz")).doesNotExist()
  }

  @Test
  fun `packageBundle creates gzipped bundle when compression enabled`() {
    // Create test bundle file
    val bundleContent = "// React Native bundle\nvar __BUNDLE_START_TIME__=Date.now();"
    val bundleFile = createTestFile(tempDir, "index.android.hbc", bundleContent)

    val outputDir = File(tempDir, "output/assets")
    val compressedFile = File(outputDir, "index.android.hbc.gz")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.outputAssetsDir.set(outputDir)
      it.bundleAssetName.set("index.android.hbc")
      it.compressionEnabled.set(true)
      it.variantName.set("release")
    }

    task.execute()

    // Verify gzipped bundle was created
    assertThat(compressedFile).exists()

    // Verify content can be decompressed
    val decompressed = GZIPInputStream(compressedFile.inputStream()).use {
      it.readBytes().toString(Charsets.UTF_8)
    }
    assertThat(decompressed).isEqualTo(bundleContent)
  }

  @Test
  fun `packageBundle handles Hermes bytecode files`() {
    // Create test Hermes bytecode file (simulated)
    val hbcContent = ByteArray(100) { it.toByte() } // Fake bytecode
    val bundleFile = File(tempDir, "index.android.hbc")
    bundleFile.writeBytes(hbcContent)

    val outputDir = File(tempDir, "output/assets")
    val outputFile = File(outputDir, "index.android.hbc")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.outputAssetsDir.set(outputDir)
      it.bundleAssetName.set("index.android.hbc")
      it.compressionEnabled.set(false)
      it.variantName.set("release")
    }

    task.execute()

    assertThat(outputFile).exists()
    assertThat(outputFile.readBytes()).isEqualTo(hbcContent)
  }

  @Test
  fun `packageDrawableAssets copies single drawable directory`() {
    // Create drawable assets
    val assetsDir = File(tempDir, "assets")
    val drawableMdpi = File(assetsDir, "drawable-mdpi")
    createTestFile(drawableMdpi, "icon.png", "fake png content")

    val outputResDir = File(tempDir, "output/res")
    val bundleFile = createTestFile(tempDir, "bundle.js", "fake")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.assetsDir.set(assetsDir)
      it.outputAssetsDir.set(File(tempDir, "output/assets"))
      it.outputResDir.set(outputResDir)
      it.bundleAssetName.set("index.android.bundle")
      it.compressionEnabled.set(false)
      it.variantName.set("release")
    }

    task.execute()

    // Verify drawable was copied
    val copiedDrawable = File(outputResDir, "drawable-mdpi/icon.png")
    assertThat(copiedDrawable).exists()
    assertThat(readFileContent(copiedDrawable)).isEqualTo("fake png content")
  }

  @Test
  fun `packageDrawableAssets copies multiple drawable densities`() {
    // Create multiple drawable density directories
    val assetsDir = File(tempDir, "assets")
    val densities = listOf("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")

    for (density in densities) {
      val drawableDir = File(assetsDir, "drawable-$density")
      createTestFile(drawableDir, "icon.png", "icon for $density")
      createTestFile(drawableDir, "logo.png", "logo for $density")
    }

    val outputResDir = File(tempDir, "output/res")
    val bundleFile = createTestFile(tempDir, "bundle.js", "fake")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.assetsDir.set(assetsDir)
      it.outputAssetsDir.set(File(tempDir, "output/assets"))
      it.outputResDir.set(outputResDir)
      it.bundleAssetName.set("index.android.bundle")
      it.compressionEnabled.set(false)
      it.variantName.set("release")
    }

    task.execute()

    // Verify all densities were copied
    for (density in densities) {
      val iconFile = File(outputResDir, "drawable-$density/icon.png")
      val logoFile = File(outputResDir, "drawable-$density/logo.png")

      assertThat(iconFile).exists()
      assertThat(logoFile).exists()
      assertThat(readFileContent(iconFile)).isEqualTo("icon for $density")
      assertThat(readFileContent(logoFile)).isEqualTo("logo for $density")
    }
  }

  @Test
  fun `packageDrawableAssets handles nested subdirectories`() {
    // Create drawable with nested structure
    val assetsDir = File(tempDir, "assets")
    val drawableXhdpi = File(assetsDir, "drawable-xhdpi")
    createTestFile(File(drawableXhdpi, "icons"), "app_icon.png", "nested icon")

    val outputResDir = File(tempDir, "output/res")
    val bundleFile = createTestFile(tempDir, "bundle.js", "fake")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.assetsDir.set(assetsDir)
      it.outputAssetsDir.set(File(tempDir, "output/assets"))
      it.outputResDir.set(outputResDir)
      it.bundleAssetName.set("index.android.bundle")
      it.compressionEnabled.set(false)
      it.variantName.set("release")
    }

    task.execute()

    // Verify nested file was copied with same structure
    val copiedNestedFile = File(outputResDir, "drawable-xhdpi/icons/app_icon.png")
    assertThat(copiedNestedFile).exists()
    assertThat(readFileContent(copiedNestedFile)).isEqualTo("nested icon")
  }

  @Test
  fun `packageDrawableAssets handles no assets directory`() {
    // Don't set assetsDir (optional)
    val outputAssetsDir = File(tempDir, "output/assets")
    val bundleFile = createTestFile(tempDir, "bundle.js", "fake")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      // assetsDir not set
      it.outputAssetsDir.set(outputAssetsDir)
      // outputResDir not set
      it.bundleAssetName.set("index.android.bundle")
      it.compressionEnabled.set(false)
      it.variantName.set("release")
    }

    // Should not throw
    task.execute()

    // Only bundle should be packaged
    assertThat(File(outputAssetsDir, "index.android.bundle")).exists()
  }

  @Test
  fun `packageDrawableAssets handles empty assets directory`() {
    // Create empty assets directory
    val assetsDir = File(tempDir, "assets")
    assetsDir.mkdirs()

    val outputResDir = File(tempDir, "output/res")
    val bundleFile = createTestFile(tempDir, "bundle.js", "fake")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.assetsDir.set(assetsDir)
      it.outputAssetsDir.set(File(tempDir, "output/assets"))
      it.outputResDir.set(outputResDir)
      it.bundleAssetName.set("index.android.bundle")
      it.compressionEnabled.set(false)
      it.variantName.set("release")
    }

    // Should not throw
    task.execute()

    // res directory may be created but empty
    if (outputResDir.exists()) {
      assertThat(outputResDir.listFiles()).isEmpty()
    }
  }

  @Test
  fun `task packages both bundle and drawables together`() {
    // Create bundle and drawables
    val bundleContent = "// React Native bundle"
    val bundleFile = createTestFile(tempDir, "index.android.bundle", bundleContent)

    val assetsDir = File(tempDir, "assets")
    createTestFile(File(assetsDir, "drawable-mdpi"), "icon.png", "mdpi icon")
    createTestFile(File(assetsDir, "drawable-hdpi"), "icon.png", "hdpi icon")

    val outputAssetsDir = File(tempDir, "output/assets")
    val outputResDir = File(tempDir, "output/res")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.assetsDir.set(assetsDir)
      it.outputAssetsDir.set(outputAssetsDir)
      it.outputResDir.set(outputResDir)
      it.bundleAssetName.set("index.android.bundle")
      it.compressionEnabled.set(false)
      it.variantName.set("release")
    }

    task.execute()

    // Verify both bundle and drawables were packaged
    assertThat(File(outputAssetsDir, "index.android.bundle")).exists()
    assertThat(File(outputResDir, "drawable-mdpi/icon.png")).exists()
    assertThat(File(outputResDir, "drawable-hdpi/icon.png")).exists()
  }

  @Test
  fun `gzip compression actually reduces file size for text bundles`() {
    // Create large repetitive text bundle (compresses well)
    val bundleContent = "var x = 'test';\n".repeat(1000)
    val bundleFile = createTestFile(tempDir, "large.bundle", bundleContent)

    val outputDir = File(tempDir, "output/assets")

    val task = createTestTask<AssetPackagingTask> {
      it.bundleFile.set(bundleFile)
      it.outputAssetsDir.set(outputDir)
      it.bundleAssetName.set("large.bundle")
      it.compressionEnabled.set(true)
      it.variantName.set("release")
    }

    task.execute()

    val compressedFile = File(outputDir, "large.bundle.gz")
    assertThat(compressedFile).exists()

    // Compressed file should be smaller than original
    assertThat(compressedFile.length()).isLessThan(bundleFile.length())
  }
}
