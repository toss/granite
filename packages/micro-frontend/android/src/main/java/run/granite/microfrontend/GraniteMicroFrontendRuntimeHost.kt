package run.granite.microfrontend

import java.util.UUID

object GraniteMicroFrontendRuntimeHost {
    private val lock = Any()
    private val sessions = mutableMapOf<String, SessionEntry>()
    private val eventRouter = GraniteMicroFrontendRuntimeEventRouter()
    private val preloadRequests = GraniteMicroFrontendPreloadRequests()

    @JvmStatic
    fun registerSession(sessionId: String, closeAction: Runnable): GraniteMicroFrontendSessionRegistration {
        require(sessionId.isNotBlank()) { "sessionId must not be blank" }
        val token = UUID.randomUUID().toString()
        synchronized(lock) {
            check(sessions[sessionId] == null) { "Session '$sessionId' is already registered" }
            sessions[sessionId] = SessionEntry(token, closeAction)
        }
        return GraniteMicroFrontendSessionRegistration(sessionId, token)
    }

    @JvmStatic
    fun emit(event: GraniteMicroFrontendEvent) = eventRouter.emit(event)

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

    @JvmStatic
    fun emitOpenApp(sessionId: String, appName: String, scheme: String) =
        emit(GraniteMicroFrontendEvent.OpenApp(sessionId, appName, scheme))

    @JvmStatic
    fun emitCloseApp(sessionId: String) = emit(GraniteMicroFrontendEvent.CloseApp(sessionId))

    @JvmStatic
    fun emitSessionVisibilityChanged(sessionId: String, isVisible: Boolean) =
        emit(GraniteMicroFrontendEvent.SessionVisibilityChanged(sessionId, isVisible))

    internal fun attach(module: GraniteMicroFrontendRuntimeModule) = eventRouter.attach(module)

    internal fun startEventDelivery(module: GraniteMicroFrontendRuntimeModule) =
        eventRouter.startEventDelivery(module)

    internal fun detach(module: GraniteMicroFrontendRuntimeModule) = eventRouter.detach(module)

    internal fun requestCloseSession(sessionId: String): CloseRequestResult {
        val action = synchronized(lock) {
            val session = sessions[sessionId] ?: return CloseRequestResult.NotFound
            if (session.closeRequested) {
                return CloseRequestResult.Accepted
            }
            session.closeRequested = true
            session.closeAction
        }
        return try {
            action.run()
            CloseRequestResult.Accepted
        } catch (error: Exception) {
            CloseRequestResult.Failed(error)
        }
    }

    internal fun completePreloadApp(requestId: String, errorMessage: String?) {
        preloadRequests.complete(requestId, errorMessage)
    }

    internal fun cancelPreloadApp(requestId: String) {
        preloadRequests.cancel(requestId)
    }

    internal fun unregisterSession(sessionId: String, token: String) {
        synchronized(lock) {
            if (sessions[sessionId]?.token == token) {
                sessions.remove(sessionId)
            }
        }
    }

    private data class SessionEntry(
        val token: String,
        val closeAction: Runnable,
        var closeRequested: Boolean = false,
    )
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

class GraniteMicroFrontendSessionRegistration internal constructor(
    private val sessionId: String,
    private val token: String,
) : AutoCloseable {
    override fun close() {
        GraniteMicroFrontendRuntimeHost.unregisterSession(sessionId, token)
    }
}

internal sealed interface CloseRequestResult {
    data object Accepted : CloseRequestResult
    data object NotFound : CloseRequestResult
    data class Failed(val cause: Exception) : CloseRequestResult
}
