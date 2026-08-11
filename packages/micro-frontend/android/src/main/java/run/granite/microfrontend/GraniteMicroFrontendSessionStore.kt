package run.granite.microfrontend

internal class GraniteMicroFrontendSessionStore(
    private val emit: (GraniteMicroFrontendEvent) -> Unit,
) {
    private val lock = Any()
    private val sessions = mutableMapOf<String, SessionEntry>()

    fun registerSession(sessionId: String, closeAction: Runnable): GraniteMicroFrontendSessionRegistration {
        require(sessionId.isNotBlank()) { "sessionId must not be blank" }
        val token = java.util.UUID.randomUUID().toString()
        synchronized(lock) {
            check(sessions[sessionId] == null) { "Session '$sessionId' is already registered" }
            sessions[sessionId] = SessionEntry(token, closeAction)
        }
        return GraniteMicroFrontendSessionRegistration(this, sessionId, token)
    }

    fun requestCloseSession(sessionId: String): CloseRequestResult {
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

    fun openApp(sessionId: String, token: String, appName: String, scheme: String): Boolean {
        require(appName.isNotBlank()) { "appName must not be blank" }
        require(scheme.isNotBlank()) { "scheme must not be blank" }
        val shouldEmit = synchronized(lock) {
            val session = sessions[sessionId] ?: return false
            if (session.token != token || session.opened || session.closed) {
                return false
            }
            session.opened = true
            true
        }
        if (shouldEmit) {
            emit(GraniteMicroFrontendEvent.OpenApp(sessionId, appName, scheme))
        }
        return shouldEmit
    }

    fun setVisible(sessionId: String, token: String, isVisible: Boolean): Boolean {
        val shouldEmit = synchronized(lock) {
            val session = sessions[sessionId] ?: return false
            if (session.token != token || !session.opened || session.closed || session.isVisible == isVisible) {
                return false
            }
            session.isVisible = isVisible
            true
        }
        if (shouldEmit) {
            emit(GraniteMicroFrontendEvent.SessionVisibilityChanged(sessionId, isVisible))
        }
        return shouldEmit
    }

    fun closeApp(sessionId: String, token: String): Boolean {
        val shouldEmit = synchronized(lock) {
            val session = sessions[sessionId] ?: return false
            if (session.token != token || !session.opened || session.closed) {
                return false
            }
            session.closed = true
            true
        }
        if (shouldEmit) {
            emit(GraniteMicroFrontendEvent.CloseApp(sessionId))
        }
        return shouldEmit
    }

    fun unregisterSession(sessionId: String, token: String) {
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
        var opened: Boolean = false,
        var isVisible: Boolean = false,
        var closed: Boolean = false,
    )
}

class GraniteMicroFrontendSessionRegistration internal constructor(
    private val store: GraniteMicroFrontendSessionStore,
    private val sessionId: String,
    private val token: String,
) : AutoCloseable {
    fun openApp(appName: String, scheme: String): Boolean = store.openApp(sessionId, token, appName, scheme)

    fun setVisible(isVisible: Boolean): Boolean = store.setVisible(sessionId, token, isVisible)

    fun closeApp(): Boolean = store.closeApp(sessionId, token)

    override fun close() {
        store.unregisterSession(sessionId, token)
    }
}

internal sealed interface CloseRequestResult {
    data object Accepted : CloseRequestResult
    data object NotFound : CloseRequestResult
    data class Failed(val cause: Exception) : CloseRequestResult
}
