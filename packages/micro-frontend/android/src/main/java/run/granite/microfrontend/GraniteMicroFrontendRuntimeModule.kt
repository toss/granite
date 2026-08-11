package run.granite.microfrontend

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeGraniteMicroFrontendRuntimeSpec.NAME)
class GraniteMicroFrontendRuntimeModule(
    reactContext: ReactApplicationContext,
) : NativeGraniteMicroFrontendRuntimeSpec(reactContext), GraniteMicroFrontendRuntimeEventTarget {
    override fun initialize() {
        super.initialize()
        GraniteMicroFrontendRuntimeHost.attach(this)
    }

    override fun invalidate() {
        GraniteMicroFrontendRuntimeHost.detach(this)
        super.invalidate()
    }

    override fun evaluateScript(request: ReadableMap, promise: Promise) {
        val filePath = request.getString("filePath")
        if (filePath == null) {
            promise.reject(ERROR_INVALID_REQUEST, "evaluateScript requires request.filePath")
            return
        }

        val enqueued = reactApplicationContext.runOnJSQueueThread {
            try {
                BundleEvaluator(reactApplicationContext).evaluateFile(filePath)
                promise.resolve(null)
            } catch (error: Exception) {
                promise.reject(ERROR_EVALUATE_SCRIPT, error.message, error)
            }
        }
        if (!enqueued) {
            promise.reject(ERROR_EVALUATE_SCRIPT, "Failed to enqueue script evaluation on the JS queue")
        }
    }

    override fun startEventDelivery() {
        GraniteMicroFrontendRuntimeHost.startEventDelivery(this)
    }

    override fun emit(event: GraniteMicroFrontendEvent): Boolean =
        reactApplicationContext.runOnJSQueueThread {
            emitOnEvent(event.toWritableMap())
        }

    private companion object {
        const val ERROR_INVALID_REQUEST = "INVALID_REQUEST"
        const val ERROR_EVALUATE_SCRIPT = "EVALUATE_SCRIPT_FAILED"
    }
}
