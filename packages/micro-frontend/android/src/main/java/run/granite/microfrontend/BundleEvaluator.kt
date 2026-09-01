package run.granite.microfrontend

import android.content.res.AssetManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.annotations.FrameworkAPI
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException

internal sealed interface ResolvedBundleSource {
    val sourceUrl: String

    data class Asset(
        val scriptData: ByteArray,
        override val sourceUrl: String,
    ) : ResolvedBundleSource

    data class FilePath(
        val filePath: String,
        override val sourceUrl: String,
    ) : ResolvedBundleSource
}

internal fun resolveBundleSource(assetManager: AssetManager, bundlePath: String): ResolvedBundleSource {
    if (bundlePath.startsWith(ASSET_PREFIX)) {
        val assetPath = bundlePath.removePrefix(ASSET_PREFIX)
        require(assetPath.isNotBlank()) { "Bundle asset path must not be blank: $bundlePath" }
        val scriptData = assetManager.open(assetPath).use { it.readBytes() }
        if (scriptData.isEmpty()) {
            throw IOException("Bundle asset is empty: $bundlePath")
        }
        return ResolvedBundleSource.Asset(scriptData, bundlePath)
    }

    val file = File(bundlePath)
    require(file.isAbsolute) { "Bundle path must be absolute: $bundlePath" }
    if (!file.exists()) {
        throw FileNotFoundException("Bundle file does not exist: $bundlePath")
    }
    if (!file.canRead()) {
        throw IOException("Bundle file is not readable: $bundlePath")
    }
    return ResolvedBundleSource.FilePath(bundlePath, file.toURI().toString())
}

@OptIn(FrameworkAPI::class)
internal class BundleEvaluator(
    private val reactContext: ReactApplicationContext,
) {
    /**
     * Evaluates a bundle on the JSI runtime reached through `javaScriptContextHolder`. That holder
     * is a framework-internal API, so this path is only verified against the React Native version
     * this package is developed against (`catalog:react-native`, currently 0.84.0).
     * `peerDependencies` declares `*`; a host on another version should re-verify it.
     */
    private external fun evaluateFileSync(
        runtimePointer: Long,
        filePath: String,
        sourceUrl: String,
    )

    private external fun evaluateScriptSync(
        runtimePointer: Long,
        scriptData: ByteArray,
        sourceUrl: String,
    )

    @Throws(FileNotFoundException::class, IOException::class)
    fun evaluateFile(filePath: String) {
        val source = resolveBundleSource(reactContext.assets, filePath)
        val runtimePointer = reactContext.javaScriptContextHolder?.get()
            ?: throw IllegalStateException("JavaScript runtime is unavailable")
        when (source) {
            is ResolvedBundleSource.Asset -> evaluateScriptSync(runtimePointer, source.scriptData, source.sourceUrl)
            is ResolvedBundleSource.FilePath -> evaluateFileSync(runtimePointer, source.filePath, source.sourceUrl)
        }
    }

    private companion object {
        init {
            System.loadLibrary("granite-micro-frontend")
        }
    }
}

private const val ASSET_PREFIX = "assets://"
