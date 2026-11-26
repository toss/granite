package run.granite.microfrontend

import android.os.Handler
import android.os.Looper
import com.facebook.common.logging.FLog

/** Why [GraniteMicroFrontendSessionRegistration.closeApp] says a session's resources may now be released. */
object GraniteMicroFrontendSessionReleaseReason {
    /** JavaScript reported that the session's React tree unmounted (its effect cleanups have run). */
    const val UNMOUNTED = "unmounted"

    /** JavaScript did not report the unmount within the timeout (a stalled runtime, or a bundle without the report). */
    const val TIMEOUT = "timeout"

    /** The JavaScript runtime that would report it is gone. */
    const val RUNTIME_DETACHED = "runtimeDetached"

    /**
     * No `closeApp` was sent and none awaits the unmount (the session never opened, or its resources were already
     * released), so JavaScript has nothing to unmount.
     */
    const val NOT_OPENED = "notOpened"
}

/** Runs unmount handlers on the main thread. Replaceable in tests. */
internal interface GraniteMainThreadScheduler {
    fun post(block: () -> Unit)

    fun postDelayed(delayMillis: Long, block: () -> Unit)
}

private object LooperMainThreadScheduler : GraniteMainThreadScheduler {
    private val handler by lazy { Handler(Looper.getMainLooper()) }

    override fun post(block: () -> Unit) {
        handler.post(block)
    }

    override fun postDelayed(delayMillis: Long, block: () -> Unit) {
        handler.postDelayed(block, delayMillis)
    }
}

internal class GraniteMicroFrontendSessionStore(
    private val emit: (GraniteMicroFrontendEvent) -> Unit,
    private val mainThread: GraniteMainThreadScheduler = LooperMainThreadScheduler,
) {
    private val lock = Any()
    private val sessions = mutableMapOf<String, SessionEntry>()

    /**
     * Closed sessions whose release waits for JavaScript's unmount report, keyed by session id, oldest close first.
     * An id can hold several: once a registration is unregistered, the id can be registered and closed again while
     * the earlier close is still awaited.
     */
    private val awaitingUnmount = mutableMapOf<String, ArrayDeque<AwaitingUnmount>>()

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

    fun openApp(
        sessionId: String,
        token: String,
        appName: String,
        scheme: String,
        key: String? = null,
        rootKey: String? = null,
    ): Boolean {
        require(appName.isNotBlank()) { "appName must not be blank" }
        require(scheme.isNotBlank()) { "scheme must not be blank" }
        require(key == null || key.isNotEmpty()) { "key must not be empty" }
        require(rootKey == null || rootKey.isNotEmpty()) { "rootKey must not be empty" }
        return synchronized(lock) {
            val session = sessions[sessionId] ?: return false
            if (session.token != token || session.opened || session.closed) {
                return false
            }
            session.opened = true
            emit(GraniteMicroFrontendEvent.OpenApp(sessionId, appName, scheme, key, rootKey))
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

    fun closeApp(sessionId: String, token: String, unmountTimeoutMillis: Long, onUnmount: (String) -> Unit): Boolean {
        val outcome = synchronized(lock) {
            val awaiting = awaitingUnmount[sessionId]?.firstOrNull { it.token == token }
            val session = sessions[sessionId]
            if (awaiting != null) {
                // closeApp already went out and its unmount is still awaited: releasing now would cut off the
                // cleanups that are still running, so this handler waits for the same release.
                awaiting.handlers += onUnmount
                CloseOutcome.Joined
            } else if (session == null || session.token != token || !session.opened || session.closed) {
                CloseOutcome.NotSent
            } else {
                session.closed = true
                val entry = AwaitingUnmount(token, mutableListOf(onUnmount))
                // Registered before the event goes out, so a fast report cannot arrive first.
                awaitingUnmount.getOrPut(sessionId) { ArrayDeque() }.addLast(entry)
                emit(GraniteMicroFrontendEvent.CloseApp(sessionId))
                CloseOutcome.Sent(entry)
            }
        }
        when (outcome) {
            is CloseOutcome.Sent -> {
                mainThread.postDelayed(unmountTimeoutMillis.coerceAtLeast(0)) {
                    release(sessionId, outcome.entry, GraniteMicroFrontendSessionReleaseReason.TIMEOUT)
                }
                return true
            }
            CloseOutcome.Joined -> return false
            CloseOutcome.NotSent -> {
                mainThread.post { onUnmount(GraniteMicroFrontendSessionReleaseReason.NOT_OPENED) }
                return false
            }
        }
    }

    /** JavaScript reports that a closed session's React tree unmounted. Any thread. */
    fun sessionDidUnmount(sessionId: String) {
        mainThread.post { releaseOldest(sessionId, GraniteMicroFrontendSessionReleaseReason.UNMOUNTED) }
    }

    /** The runtime that would report the pending unmounts is gone. */
    fun releaseAllAwaitingUnmount(reason: String) {
        val handlers = synchronized(lock) {
            awaitingUnmount.values.flatMap { queue -> queue.flatMap { it.handlers } }.also { awaitingUnmount.clear() }
        }
        if (handlers.isNotEmpty()) {
            mainThread.post { handlers.forEach { it(reason) } }
        }
    }

    /** Main thread. Calls the handlers of [entry] once; later reasons find nothing. */
    private fun release(sessionId: String, entry: AwaitingUnmount, reason: String) {
        synchronized(lock) {
            val queue = awaitingUnmount[sessionId] ?: return
            if (!queue.remove(entry)) return
            if (queue.isEmpty()) awaitingUnmount.remove(sessionId)
        }
        entry.handlers.forEach { it(reason) }
    }

    /**
     * Main thread. The unmount report carries only the session id, so it settles the oldest close still awaited
     * under that id; a later close of the same id keeps waiting for its own report or timeout.
     */
    private fun releaseOldest(sessionId: String, reason: String) {
        val oldest = synchronized(lock) {
            val queue = awaitingUnmount[sessionId] ?: return
            queue.removeFirst().also { if (queue.isEmpty()) awaitingUnmount.remove(sessionId) }
        }
        oldest.handlers.forEach { it(reason) }
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

    private sealed interface CloseOutcome {
        class Sent(val entry: AwaitingUnmount) : CloseOutcome

        object Joined : CloseOutcome

        object NotSent : CloseOutcome
    }

    /** The unmount handlers of one closed session, for the registration ([token]) that closed it. */
    private class AwaitingUnmount(val token: String, val handlers: MutableList<(String) -> Unit>)

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
    @JvmOverloads
    fun openApp(appName: String, scheme: String, key: String? = null, rootKey: String? = null): Boolean =
        store.openApp(sessionId, token, appName, scheme, key, rootKey)

    fun setVisible(isVisible: Boolean): Boolean = store.setVisible(sessionId, token, isVisible)

    fun closeApp(): Boolean = store.closeApp(sessionId, token)

    /**
     * Sends `closeApp` like [closeApp], then calls [onUnmount] exactly once, on the main thread, when the session's
     * resources may be released: when JavaScript reports the unmount, after [unmountTimeoutMillis], or when the
     * runtime is gone. The argument is a [GraniteMicroFrontendSessionReleaseReason]. Keep what the session's
     * JavaScript can still call (for example its native module registry) until then.
     *
     * Returns whether `closeApp` was sent. [close] may be called right after; it does not cancel [onUnmount].
     * When an earlier call already sent `closeApp` and its unmount is still awaited, this call sends nothing,
     * returns false, and [onUnmount] is called with the same release as that earlier call (its timeout applies).
     */
    fun closeApp(unmountTimeoutMillis: Long, onUnmount: (reason: String) -> Unit): Boolean =
        store.closeApp(sessionId, token, unmountTimeoutMillis, onUnmount)

    override fun close() {
        store.unregisterSession(sessionId, token)
    }
}
