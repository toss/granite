package run.granite.gradle.tasks

import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.*
import java.io.File
import java.util.zip.GZIPOutputStream

/**
 * Gradle task for packaging React Native assets and bundles.
 *
 * This task:
 * 1. Copies the JavaScript bundle to Android assets directory
 * 2. Compresses the bundle with gzip (if enabled)
 * 3. Copies React Native drawable assets
 * 4. Organizes assets per build variant
 *
 * The packaged assets are included in the final AAR file.
 *
 * Inputs:
 * - JavaScript bundle file
 * - React Native assets directory
 * - Compression settings
 *
 * Outputs:
 * - Assets in src/{variant}/assets/
 * - Drawable resources in src/{variant}/res/
 */
@CacheableTask
abstract class AssetPackagingTask : DefaultTask() {

    /**
     * JavaScript bundle file to package.
     */
    @get:InputFile
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val bundleFile: RegularFileProperty

    /**
     * Directory containing React Native drawable assets.
     */
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    @get:Optional
    abstract val assetsDir: DirectoryProperty

    /**
     * Output assets directory (src/{variant}/assets/).
     */
    @get:OutputDirectory
    abstract val outputAssetsDir: DirectoryProperty

    /**
     * Output resources directory (src/{variant}/res/).
     */
    @get:OutputDirectory
    @get:Optional
    abstract val outputResDir: DirectoryProperty

    /**
     * Bundle asset name (e.g., "index.android.bundle").
     */
    @get:Input
    abstract val bundleAssetName: Property<String>

    /**
     * Whether to compress the bundle with gzip.
     */
    @get:Input
    abstract val compressionEnabled: Property<Boolean>

    /**
     * Variant name for logging.
     */
    @get:Input
    abstract val variantName: Property<String>

    init {
        group = "granite"
        description = "Packages React Native assets and bundles"
    }

    @TaskAction
    fun execute() {
        val variant = variantName.get()
        logger.lifecycle("Packaging assets for variant: $variant")

        // Package JavaScript bundle
        packageBundle()

        // Package drawable assets
        packageDrawableAssets()

        logger.lifecycle("Asset packaging complete for variant: $variant")
    }

    /**
     * Packages the JavaScript bundle into the assets directory.
     *
     * If compression is enabled, creates a gzipped bundle file.
     */
    private fun packageBundle() {
        val bundleSource = bundleFile.get().asFile
        val bundleName = bundleAssetName.get()

        if (!bundleSource.exists()) {
            error(
                """
                |Bundle file not found: ${bundleSource.absolutePath}
                |
                |Solution: Ensure the bundle task completed successfully before packaging.
                """.trimMargin()
            )
        }

        val outputDir = outputAssetsDir.get().asFile
        outputDir.mkdirs()

        if (compressionEnabled.get()) {
            // Create gzipped bundle
            val compressedBundle = File(outputDir, "$bundleName.gz")
            logger.lifecycle("Compressing bundle: ${compressedBundle.name}")

            bundleSource.inputStream().use { input ->
                GZIPOutputStream(compressedBundle.outputStream()).use { gzipOut ->
                    input.copyTo(gzipOut)
                }
            }

            logger.lifecycle("Created compressed bundle: ${compressedBundle.absolutePath}")
        } else {
            // Copy bundle without compression
            val outputBundle = File(outputDir, bundleName)
            bundleSource.copyTo(outputBundle, overwrite = true)
            logger.lifecycle("Copied bundle: ${outputBundle.absolutePath}")
        }
    }

    /**
     * Packages React Native drawable assets into the res directory.
     *
     * Copies drawable-* directories from the assets directory to the Android
     * resources directory for inclusion in the AAR.
     */
    private fun packageDrawableAssets() {
        if (!assetsDir.isPresent) {
            logger.debug("No assets directory specified, skipping drawable packaging")
            return
        }

        val assetsSource = assetsDir.get().asFile
        if (!assetsSource.exists()) {
            logger.debug("Assets directory does not exist: ${assetsSource.absolutePath}")
            return
        }

        if (!outputResDir.isPresent) {
            logger.debug("No output res directory specified, skipping drawable packaging")
            return
        }

        val outputRes = outputResDir.get().asFile
        outputRes.mkdirs()

        // Find all drawable-* directories
        val drawableDirs = assetsSource.listFiles { file ->
            file.isDirectory && file.name.startsWith("drawable-")
        } ?: emptyArray()

        if (drawableDirs.isEmpty()) {
            logger.debug("No drawable directories found in assets")
            return
        }

        // Copy each drawable directory
        for (drawableDir in drawableDirs) {
            val targetDir = File(outputRes, drawableDir.name)
            targetDir.mkdirs()

            drawableDir.walk()
                .filter { it.isFile }
                .forEach { sourceFile ->
                    val relativePath = sourceFile.relativeTo(drawableDir).path
                    val targetFile = File(targetDir, relativePath)
                    targetFile.parentFile.mkdirs()
                    sourceFile.copyTo(targetFile, overwrite = true)
                }

            logger.lifecycle("Copied drawable assets: ${drawableDir.name}")
        }
    }
}
