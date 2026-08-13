package run.granite.microfrontend

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.annotations.FrameworkAPI
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException

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

    @Throws(FileNotFoundException::class, IOException::class)
    fun evaluateFile(filePath: String) {
        val file = File(filePath)
        require(file.isAbsolute) { "Bundle path must be absolute: $filePath" }
        if (!file.exists()) {
            throw FileNotFoundException("Bundle file does not exist: $filePath")
        }
        if (!file.canRead()) {
            throw IOException("Bundle file is not readable: $filePath")
        }

        val runtimePointer = reactContext.javaScriptContextHolder?.get()
            ?: throw IllegalStateException("JavaScript runtime is unavailable")
        evaluateFileSync(runtimePointer, filePath, file.toURI().toString())
    }

    private companion object {
        init {
            System.loadLibrary("granite-micro-frontend")
        }
    }
}
