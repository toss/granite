package run.granite.microfrontend

import java.lang.ref.WeakReference
import java.util.UUID

object GraniteMicroFrontendRuntimeHost {
    private val lock = Any()
    private val sessions = mutableMapOf<String, SessionEntry>()
    private val pendingEvents = ArrayDeque<GraniteMicroFrontendEvent>()
    private var moduleReference = WeakReference<GraniteMicroFrontendRuntimeModule>(null)

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
    fun emit(event: GraniteMicroFrontendEvent) {
        val module = synchronized(lock) {
            moduleReference.get()?.also { return@synchronized it }
            pendingEvents.addLast(event)
            null
        }
        module?.emit(event)
    }

    @JvmStatic
    fun emitPreloadApp(appName: String) = emit(GraniteMicroFrontendEvent.PreloadApp(appName))

    @JvmStatic
    fun emitOpenApp(sessionId: String, appName: String, scheme: String) =
        emit(GraniteMicroFrontendEvent.OpenApp(sessionId, appName, scheme))

    @JvmStatic
    fun emitCloseApp(sessionId: String) = emit(GraniteMicroFrontendEvent.CloseApp(sessionId))

    @JvmStatic
    fun emitSessionVisibilityChanged(sessionId: String, isVisible: Boolean) =
        emit(GraniteMicroFrontendEvent.SessionVisibilityChanged(sessionId, isVisible))

    internal fun attach(module: GraniteMicroFrontendRuntimeModule) {
        val events = synchronized(lock) {
            moduleReference = WeakReference(module)
            pendingEvents.toList().also { pendingEvents.clear() }
        }
        events.forEach(module::emit)
    }

    internal fun detach(module: GraniteMicroFrontendRuntimeModule) {
        synchronized(lock) {
            if (moduleReference.get() === module) {
                moduleReference.clear()
            }
        }
    }

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
