package run.granite.microfrontend

import com.facebook.common.logging.FLog

internal class GraniteMicroFrontendSessionStore(
    private val emit: (GraniteMicroFrontendEvent) -> Unit,
) {
    private val lock = Any()
    private val sessions = mutableMapOf<String, SessionEntry>()

    fun registerSession(sessionId: String): GraniteMicroFrontendSessionRegistration {
        require(sessionId.isNotBlank()) { "sessionId must not be blank" }
        val token = java.util.UUID.randomUUID().toString()
        val liveSessions = synchronized(lock) {
            check(sessions[sessionId] == null) { "Session '$sessionId' is already registered" }
            sessions[sessionId] = SessionEntry(token)
            sessions.size
        }
        FLog.d(TAG, "Registered session '%s' (%d live)", sessionId, liveSessions)
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
        val removed = synchronized(lock) {
            val entry = sessions[sessionId]
            when {
                entry == null -> Outcome.UNKNOWN
                entry.token != token -> Outcome.STALE_TOKEN
                else -> {
                    sessions.remove(sessionId)
                    Outcome.REMOVED
                }
            }
        }
        // Both misses are silent no-ops today. They are worth a warning because each points at a
        // different lifecycle bug and neither leaves any other trace.
        when (removed) {
            Outcome.REMOVED -> FLog.d(TAG, "Unregistered session '%s'", sessionId)
            // Nothing to remove: this registration was already released, or was never made here.
            Outcome.UNKNOWN ->
                FLog.w(TAG, "Ignoring unregister for unknown session '%s'", sessionId)
            // An entry under this id exists but belongs to a different registration, so whoever
            // owns it never released it. The id stays occupied and registerSession() will keep
            // throwing for it.
            Outcome.STALE_TOKEN ->
                FLog.w(TAG, "Ignoring unregister for session '%s': token belongs to another registration", sessionId)
        }
    }

    private enum class Outcome { REMOVED, UNKNOWN, STALE_TOKEN }

    private data class SessionEntry(
        val token: String,
        var opened: Boolean = false,
        var isVisible: Boolean = false,
        var closed: Boolean = false,
    )

    private companion object {
        private const val TAG = "GraniteMicroFrontendRuntime"
    }
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
