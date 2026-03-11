package run.granite

import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.annotations.FrameworkAPI
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException

/**
 * Evaluates JavaScript bundles directly on the JSI runtime, outside the standard
 * BundleLoader -> ReactHostFactory -> JSBundleLoader path.
 *
 * Two evaluation modes are provided:
 * - [evaluate]: Accepts an in-memory [ByteArray]. Peak memory: 2N (Java heap + native heap copy).
 * - [evaluateFile]: Accepts a file-system path. Peak memory: N (native heap only, no Java heap
 *   allocation for bundle data; file is read via POSIX read(), not mmap).
 *
 * **WARNING: Thread Safety**
 * Both methods execute JavaScript synchronously on the calling thread via a raw JSI runtime
 * pointer. The caller must ensure they are on the JS thread before invoking either method.
 * Unlike iOS (which uses `callInvoker->invokeAsync`), Android performs no automatic thread
 * dispatch.
 */
@OptIn(FrameworkAPI::class)
class BundleEvaluator(
    private val reactContext: ReactContext,
) {
    private external fun evaluateJavascriptSync(
        jsRuntime: Long,
        code: ByteArray,
        url: String,
    )

    private external fun evaluateFileSync(
        jsRuntime: Long,
        filePath: String,
        url: String,
    )

    /**
     * Evaluates JavaScript from an in-memory byte array.
     *
     * Peak memory usage: 2N — the Java [ByteArray] is pinned on the Java heap while a copy is
     * made into a native `std::string`, resulting in two full-size allocations during evaluation.
     *
     * @param script The JavaScript source code as a byte array.
     * @param url The source URL used for stack traces and error reporting.
     */
    fun evaluate(
        script: ByteArray,
        url: String,
    ) {
        val jsRuntime =
            reactContext.javaScriptContextHolder?.get()
                ?: throw IllegalStateException("javaScriptContextHolder is null.")

        evaluateJavascriptSync(jsRuntime, script, url)
    }

    /**
     * Evaluates JavaScript from a file on the file system.
     *
     * Peak memory usage: N — the file is read directly into native memory via POSIX `read()`
     * (not `mmap`), so no Java heap allocation is needed for the bundle data itself.
     *
     * @param filePath Absolute path to the JavaScript bundle file.
     * @param url The source URL used for stack traces and error reporting.
     * @throws FileNotFoundException if the file does not exist at [filePath].
     * @throws IOException if the file exists but cannot be read (e.g., permission denied).
     */
    @Throws(FileNotFoundException::class, IOException::class)
    fun evaluateFile(filePath: String, url: String) {
        val file = File(filePath)
        if (!file.exists()) {
            throw FileNotFoundException("Bundle file not found: $filePath")
        }
        if (!file.canRead()) {
            throw IOException("Bundle file not readable (permission denied): $filePath")
        }
        val jsRuntime =
            reactContext.javaScriptContextHolder?.get()
                ?: throw IllegalStateException("javaScriptContextHolder is null.")
        evaluateFileSync(jsRuntime, filePath, url)
    }

    companion object {
        init {
            // Loads the native granite-screen library containing the JNI evaluateJavascriptSync method.
            // WARNING: This will throw UnsatisfiedLinkError if the native library is not available
            // (e.g., in unit tests without native dependencies). Use Robolectric or mock this class
            // in unit test environments.
            System.loadLibrary("granite-screen")
        }

        /**
         * Convenience method to evaluate JavaScript from an in-memory byte array.
         *
         * Peak memory usage: 2N (Java heap + native heap copy). See [BundleEvaluator.evaluate].
         *
         * @param scriptData The JavaScript source code as a byte array.
         * @param url The source URL used for stack traces and error reporting.
         * @param reactContext The React context containing the JSI runtime.
         */
        fun evaluate(
            scriptData: ByteArray,
            url: String,
            reactContext: ReactContext,
        ) {
            BundleEvaluator(reactContext).evaluate(scriptData, url)
        }

        /**
         * Convenience method to evaluate JavaScript from a file on the file system.
         *
         * Peak memory usage: N (native heap only). See [BundleEvaluator.evaluateFile].
         *
         * @param filePath Absolute path to the JavaScript bundle file.
         * @param url The source URL used for stack traces and error reporting.
         * @param reactContext The React context containing the JSI runtime.
         */
        fun evaluateFile(
            filePath: String,
            url: String,
            reactContext: ReactContext,
        ) {
            BundleEvaluator(reactContext).evaluateFile(filePath, url)
        }
    }
}
