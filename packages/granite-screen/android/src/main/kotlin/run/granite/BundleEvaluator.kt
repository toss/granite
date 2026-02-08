package run.granite

import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.annotations.FrameworkAPI

@OptIn(FrameworkAPI::class)
class BundleEvaluator(
    private val reactContext: ReactContext,
) {
    private external fun evaluateJavascriptSync(
        jsRuntime: Long,
        code: ByteArray,
        url: String,
    )

    fun evaluate(
        script: ByteArray,
        url: String,
    ) {
        val jsRuntime =
            reactContext.javaScriptContextHolder?.get()
                ?: throw IllegalStateException("javaScriptContextHolder is null.")

        evaluateJavascriptSync(jsRuntime, script, url)
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
         * Convenience method to evaluate JavaScript on the JSI runtime.
         * @param scriptData The JavaScript code as a byte array
         * @param url The source URL for error reporting
         * @param reactContext The React context containing the JSI runtime
         */
        fun evaluate(
            scriptData: ByteArray,
            url: String,
            reactContext: ReactContext,
        ) {
            BundleEvaluator(reactContext).evaluate(scriptData, url)
        }
    }
}
