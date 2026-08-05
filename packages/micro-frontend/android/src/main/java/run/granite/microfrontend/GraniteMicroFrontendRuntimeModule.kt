package run.granite.microfrontend

import com.facebook.fbreact.specs.NativeGraniteMicroFrontendRuntimeSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.UiThreadUtil

@ReactModule(name = NativeGraniteMicroFrontendRuntimeSpec.NAME)
class GraniteMicroFrontendRuntimeModule(
    reactContext: ReactApplicationContext,
) : NativeGraniteMicroFrontendRuntimeSpec(reactContext) {
    private val eventLock = Any()
    private val pendingEvents = ArrayDeque<GraniteMicroFrontendEvent>()
    private var eventDeliveryStarted = false

    override fun initialize() {
        super.initialize()
        GraniteMicroFrontendRuntimeHost.attach(this)
    }

    override fun invalidate() {
        GraniteMicroFrontendRuntimeHost.detach(this)
        super.invalidate()
    }

    override fun evaluateScript(filePath: String, promise: Promise) {
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

    override fun requestCloseSession(sessionId: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            when (val result = GraniteMicroFrontendRuntimeHost.requestCloseSession(sessionId)) {
                CloseRequestResult.Accepted -> promise.resolve(null)
                CloseRequestResult.NotFound -> promise.reject(
                    ERROR_SESSION_NOT_FOUND,
                    "No native host is registered for session '$sessionId'",
                )
                is CloseRequestResult.Failed -> promise.reject(
                    ERROR_CLOSE_SESSION,
                    result.cause.message,
                    result.cause,
                )
            }
        }
    }

    override fun startEventDelivery() {
        val events = synchronized(eventLock) {
            if (eventDeliveryStarted) {
                return
            }
            eventDeliveryStarted = true
            pendingEvents.toList().also { pendingEvents.clear() }
        }
        events.forEach(::emitImmediately)
    }

    internal fun emit(event: GraniteMicroFrontendEvent) {
        val shouldEmit = synchronized(eventLock) {
            if (!eventDeliveryStarted) {
                pendingEvents.addLast(event)
                false
            } else {
                true
            }
        }
        if (shouldEmit) {
            emitImmediately(event)
        }
    }

    private fun emitImmediately(event: GraniteMicroFrontendEvent) {
        reactApplicationContext.runOnJSQueueThread {
            emitOnEvent(event.toWritableMap())
        }
    }

    private companion object {
        const val ERROR_EVALUATE_SCRIPT = "EVALUATE_SCRIPT_FAILED"
        const val ERROR_SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
        const val ERROR_CLOSE_SESSION = "CLOSE_SESSION_FAILED"
    }
}
