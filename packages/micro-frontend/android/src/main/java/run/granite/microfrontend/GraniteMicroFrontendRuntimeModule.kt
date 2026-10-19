package run.granite.microfrontend

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeGraniteMicroFrontendRuntimeSpec.NAME)
class GraniteMicroFrontendRuntimeModule(
    reactContext: ReactApplicationContext,
) : NativeGraniteMicroFrontendRuntimeSpec(reactContext), GraniteMicroFrontendRuntimeEventTarget {
    private val evaluations = BundleEvaluationQueue(
        enqueuePreparation = { task -> reactApplicationContext.nativeModulesMessageQueueThread?.runOnQueue(task) == true },
        prepare = { path -> BundleEvaluator(reactApplicationContext).apply { prepareFile(path) } },
        enqueueEvaluation = { task -> reactApplicationContext.runOnJSQueueThread(task) },
        evaluate = { bundle -> bundle.evaluatePrepared() },
    )

    override fun initialize() {
        super.initialize()
        GraniteMicroFrontendRuntimeHost.attach(this)
    }

    override fun invalidate() {
        evaluations.invalidate()
        GraniteMicroFrontendRuntimeHost.detach(this)
        super.invalidate()
    }

    override fun evaluateScript(request: ReadableMap, promise: Promise) {
        val filePath = request.getString("filePath")
        if (filePath == null) {
            promise.reject(ERROR_INVALID_REQUEST, "evaluateScript requires request.filePath")
            return
        }

        evaluations.submit(
            filePath,
            onSuccess = { promise.resolve(null) },
            onError = { error -> promise.reject(ERROR_EVALUATE_SCRIPT, error.message, error) },
        )
    }

    override fun startEventDelivery() {
        GraniteMicroFrontendRuntimeHost.startEventDelivery(this)
    }

    override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean =
        reactApplicationContext.runOnJSQueueThread {
            emitOnEvent(event.toWritableMap())
            onDelivered()
        }

    private companion object {
        const val ERROR_INVALID_REQUEST = "INVALID_REQUEST"
        const val ERROR_EVALUATE_SCRIPT = "EVALUATE_SCRIPT_FAILED"
    }
}
