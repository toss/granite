package run.granite.microfrontend

import java.util.UUID

object GraniteMicroFrontendRuntimeHost {
    private val eventRouter = GraniteMicroFrontendRuntimeEventRouter()
    private val preloadRequests = GraniteMicroFrontendPreloadRequests()
    private val sessionStore = GraniteMicroFrontendSessionStore(eventRouter::emit)

    @JvmStatic
    fun registerSession(sessionId: String, closeAction: Runnable): GraniteMicroFrontendSessionRegistration =
        sessionStore.registerSession(sessionId, closeAction)

    @JvmSynthetic
    internal fun emit(event: GraniteMicroFrontendEvent) = eventRouter.emit(event)

    @JvmStatic
    fun emitPreloadApp(appName: String) = emit(GraniteMicroFrontendEvent.PreloadApp(appName))

    @JvmStatic
    fun requestPreloadApp(
        appName: String,
        callback: GraniteMicroFrontendPreloadCallback,
    ): GraniteMicroFrontendPreloadRegistration {
        require(appName.isNotBlank()) { "appName must not be blank" }
        val requestId = preloadRequests.create(callback)
        emit(GraniteMicroFrontendEvent.PreloadApp(appName, requestId))
        return GraniteMicroFrontendPreloadRegistration(requestId)
    }

    @JvmSynthetic
    internal fun emitOpenApp(sessionId: String, appName: String, scheme: String) =
        emit(GraniteMicroFrontendEvent.OpenApp(sessionId, appName, scheme))

    @JvmSynthetic
    internal fun emitCloseApp(sessionId: String) = emit(GraniteMicroFrontendEvent.CloseApp(sessionId))

    @JvmSynthetic
    internal fun emitSessionVisibilityChanged(sessionId: String, isVisible: Boolean) =
        emit(GraniteMicroFrontendEvent.SessionVisibilityChanged(sessionId, isVisible))

    @JvmSynthetic
    internal fun attach(module: GraniteMicroFrontendRuntimeModule) = eventRouter.attach(module)

    @JvmSynthetic
    internal fun startEventDelivery(module: GraniteMicroFrontendRuntimeModule) =
        eventRouter.startEventDelivery(module)

    @JvmSynthetic
    internal fun detach(module: GraniteMicroFrontendRuntimeModule) = eventRouter.detach(module)

    @JvmSynthetic
    internal fun requestCloseSession(sessionId: String): CloseRequestResult =
        sessionStore.requestCloseSession(sessionId)

    @JvmSynthetic
    internal fun completePreloadApp(requestId: String, errorMessage: String?) {
        preloadRequests.complete(requestId, errorMessage)
    }

    @JvmSynthetic
    internal fun cancelPreloadApp(requestId: String) {
        preloadRequests.cancel(requestId)
    }

    @JvmSynthetic
    internal fun unregisterSession(sessionId: String, token: String) {
        sessionStore.unregisterSession(sessionId, token)
    }
}

internal interface GraniteMicroFrontendRuntimeEventTarget {
    fun emit(event: GraniteMicroFrontendEvent)
}

internal class GraniteMicroFrontendRuntimeEventRouter {
    private val lock = Any()
    private val pendingEvents = ArrayDeque<GraniteMicroFrontendEvent>()
    private val attachedTargets = mutableSetOf<GraniteMicroFrontendRuntimeEventTarget>()
    private var activeTarget: GraniteMicroFrontendRuntimeEventTarget? = null

    fun attach(target: GraniteMicroFrontendRuntimeEventTarget) {
        synchronized(lock) {
            attachedTargets.add(target)
        }
    }

    fun startEventDelivery(target: GraniteMicroFrontendRuntimeEventTarget) {
        val events = synchronized(lock) {
            check(target in attachedTargets) { "Runtime must be attached before starting event delivery" }
            if (activeTarget != null && activeTarget !== target) {
                return
            }
            activeTarget = target
            pendingEvents.toList().also { pendingEvents.clear() }
        }
        events.forEach(target::emit)
    }

    fun emit(event: GraniteMicroFrontendEvent) {
        val target = synchronized(lock) {
            activeTarget?.also { return@synchronized it }
            pendingEvents.addLast(event)
            null
        }
        target?.emit(event)
    }

    fun detach(target: GraniteMicroFrontendRuntimeEventTarget) {
        synchronized(lock) {
            attachedTargets.remove(target)
            if (activeTarget === target) {
                activeTarget = null
            }
        }
    }
}

interface GraniteMicroFrontendPreloadCallback {
    fun onSuccess()
    fun onFailure(errorMessage: String)
}

class GraniteMicroFrontendPreloadRegistration internal constructor(
    private val requestId: String,
) : AutoCloseable {
    override fun close() {
        GraniteMicroFrontendRuntimeHost.cancelPreloadApp(requestId)
    }
}

internal class GraniteMicroFrontendPreloadRequests {
    private val lock = Any()
    private val callbacks = mutableMapOf<String, GraniteMicroFrontendPreloadCallback>()

    fun create(callback: GraniteMicroFrontendPreloadCallback): String {
        val requestId = UUID.randomUUID().toString()
        synchronized(lock) {
            callbacks[requestId] = callback
        }
        return requestId
    }

    fun complete(requestId: String, errorMessage: String?): Boolean {
        val callback = synchronized(lock) { callbacks.remove(requestId) } ?: return false
        if (errorMessage == null) {
            callback.onSuccess()
        } else {
            callback.onFailure(errorMessage)
        }
        return true
    }

    fun cancel(requestId: String) {
        synchronized(lock) {
            callbacks.remove(requestId)
        }
    }
}
