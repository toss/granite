package run.granite.microfrontend

internal class GraniteMicroFrontendSessionStore(
    private val emit: (GraniteMicroFrontendEvent) -> Unit,
) {
    private val lock = Any()
    private val sessions = mutableMapOf<String, SessionEntry>()

    fun registerSession(sessionId: String): GraniteMicroFrontendSessionRegistration {
        require(sessionId.isNotBlank()) { "sessionId must not be blank" }
        val token = java.util.UUID.randomUUID().toString()
        synchronized(lock) {
            check(sessions[sessionId] == null) { "Session '$sessionId' is already registered" }
            sessions[sessionId] = SessionEntry(token)
        }
        return GraniteMicroFrontendSessionRegistration(this, sessionId, token)
    }

    fun openApp(sessionId: String, token: String, appName: String, scheme: String): Boolean {
        require(appName.isNotBlank()) { "appName must not be blank" }
        require(scheme.isNotBlank()) { "scheme must not be blank" }
        return synchronized(lock) {
            val session = sessions[sessionId] ?: return false
            if (session.token != token || session.opened || session.closed) {
                return false
            }
            session.opened = true
            emit(GraniteMicroFrontendEvent.OpenApp(sessionId, appName, scheme))
            true
        }
    }

    fun setVisible(sessionId: String, token: String, isVisible: Boolean): Boolean {
        return synchronized(lock) {
            val session = sessions[sessionId] ?: return false
            if (session.token != token || !session.opened || session.closed || session.isVisible == isVisible) {
                return false
            }
            session.isVisible = isVisible
            emit(GraniteMicroFrontendEvent.SessionVisibilityChanged(sessionId, isVisible))
            true
        }
    }

    fun closeApp(sessionId: String, token: String): Boolean {
        return synchronized(lock) {
            val session = sessions[sessionId] ?: return false
            if (session.token != token || !session.opened || session.closed) {
                return false
            }
            session.closed = true
            emit(GraniteMicroFrontendEvent.CloseApp(sessionId))
            true
        }
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
