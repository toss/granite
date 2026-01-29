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
            System.loadLibrary("granite-screen")
        }
    }
}
