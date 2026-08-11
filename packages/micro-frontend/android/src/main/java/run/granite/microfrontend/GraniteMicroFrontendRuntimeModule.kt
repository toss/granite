package run.granite.microfrontend

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeGraniteMicroFrontendRuntimeSpec.NAME)
class GraniteMicroFrontendRuntimeModule(
    reactContext: ReactApplicationContext,
) : NativeGraniteMicroFrontendRuntimeSpec(reactContext), GraniteMicroFrontendRuntimeEventTarget {
    private val eventLock = Any()
    private val pendingEvents = ArrayDeque<GraniteMicroFrontendEvent>()
    private var eventDeliveryStarted = false
    private var isDeliveringEvents = false

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

    override fun requestCloseSession(request: ReadableMap, promise: Promise) {
        val sessionId = request.getString("sessionId")
        if (sessionId == null) {
            promise.reject(ERROR_INVALID_REQUEST, "requestCloseSession requires request.sessionId")
            return
        }

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

    override fun completePreloadApp(request: ReadableMap) {
        val requestId = request.getString("requestId") ?: return
        val errorMessage = request.getString("errorMessage")
        GraniteMicroFrontendRuntimeHost.completePreloadApp(requestId, errorMessage)
    }

    override fun startEventDelivery() {
        synchronized(eventLock) {
            if (eventDeliveryStarted) {
                return
            }
            eventDeliveryStarted = true
            isDeliveringEvents = true
        }
        GraniteMicroFrontendRuntimeHost.startEventDelivery(this)
        drainEvents()
    }

    override fun emit(event: GraniteMicroFrontendEvent) {
        val shouldDrain = synchronized(eventLock) {
            pendingEvents.addLast(event)
            if (!eventDeliveryStarted || isDeliveringEvents) {
                return
            }
            isDeliveringEvents = true
            true
        }
        if (shouldDrain) {
            drainEvents()
        }
    }

    private fun drainEvents() {
        while (true) {
            val event = synchronized(eventLock) {
                if (pendingEvents.isEmpty()) {
                    isDeliveringEvents = false
                    return
                }
                pendingEvents.removeFirst()
            }
            val enqueued = reactApplicationContext.runOnJSQueueThread {
                emitOnEvent(event.toWritableMap())
            }
            if (!enqueued) {
                synchronized(eventLock) {
                    pendingEvents.addFirst(event)
                    eventDeliveryStarted = false
                    isDeliveringEvents = false
                }
                return
            }
        }
    }

    private companion object {
        const val ERROR_INVALID_REQUEST = "INVALID_REQUEST"
        const val ERROR_EVALUATE_SCRIPT = "EVALUATE_SCRIPT_FAILED"
        const val ERROR_SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
        const val ERROR_CLOSE_SESSION = "CLOSE_SESSION_FAILED"
    }
}
