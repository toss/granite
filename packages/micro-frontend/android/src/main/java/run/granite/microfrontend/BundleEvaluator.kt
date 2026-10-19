package run.granite.microfrontend

import android.content.res.AssetManager
import android.os.Trace
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
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
) : AutoCloseable {
    @DoNotStrip
    private var mHybridData: HybridData? = null
    private var sourceUrl: String? = null

    private external fun prepareFileSync(
        filePath: String,
    ): HybridData

    private external fun prepareScriptSync(
        scriptData: ByteArray,
    ): HybridData

    private external fun evaluatePreparedSync(
        runtimePointer: Long,
        sourceUrl: String,
    )

    @Throws(FileNotFoundException::class, IOException::class)
    fun prepareFile(filePath: String) {
        Trace.beginSection("GraniteBundle.prepare")
        try {
            check(mHybridData == null) { "Bundle was already prepared" }
            val source = resolveBundleSource(reactContext.assets, filePath)
            mHybridData = when (source) {
                is ResolvedBundleSource.Asset -> prepareScriptSync(source.scriptData)
                is ResolvedBundleSource.FilePath -> prepareFileSync(source.filePath)
            }
            sourceUrl = source.sourceUrl
        } finally {
            Trace.endSection()
        }
    }

    /**
     * Evaluates a bundle on the JSI runtime reached through `javaScriptContextHolder`. That holder
     * is a framework-internal API, so this path is only verified against the React Native version
     * this package is developed against (`catalog:react-native`, currently 0.84.0).
     * `peerDependencies` declares `*`; a host on another version should re-verify it.
     */
    fun evaluatePrepared() {
        reactContext.assertOnJSQueueThread()
        check(mHybridData?.isValid == true) { "Prepared bundle is unavailable" }
        val runtimePointer = reactContext.javaScriptContextHolder?.get()
            ?: throw IllegalStateException("JavaScript runtime is unavailable")
        Trace.beginSection("GraniteBundle.evaluate")
        try {
            evaluatePreparedSync(runtimePointer, checkNotNull(sourceUrl))
        } finally {
            Trace.endSection()
        }
    }

    override fun close() {
        mHybridData?.resetNative()
        mHybridData = null
    }

    private companion object {
        init {
            System.loadLibrary("granite-micro-frontend")
        }
    }
}

private const val ASSET_PREFIX = "assets://"
