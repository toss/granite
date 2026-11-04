package run.granite.rncomponentview

import java.util.concurrent.CopyOnWriteArraySet

/** Receives the content size the renderer measured, in dp, on the main thread. */
fun interface RNComponentContentSizeListener {
    fun onContentSizeChanged(width: Float, height: Float)
}

/**
 * Called on the main thread when a JavaScript runtime starts or stops receiving component-session events.
 * [isAttached] is the state when the call runs, not when the change happened.
 */
fun interface RNComponentRendererListener {
    fun onRendererChanged(isAttached: Boolean)
}

internal interface RNComponentEventSink {
    /** Schedules [event] for the renderer. Returns `false` when it could not be scheduled. */
    fun enqueueEvent(event: RNComponentEvent): Boolean
}

/**
 * Component sessions live in native state. A renderer that starts delivery, including one in a restarted runtime,
 * first receives every open component with its latest props, then each change as it happens. The first live renderer
 * receives the events until it detaches.
 */
internal class RNComponentSessionStore(
    private val runOnMainThread: (Runnable) -> Unit,
) {
    private val lock = Any()
    private val sessions = mutableMapOf<String, SessionEntry>()

    /** Open order, so a starting renderer receives components in the order hosts opened them. */
    private val openedSessionIds = LinkedHashSet<String>()
    private var sink: RNComponentEventSink? = null
    private val rendererListeners = CopyOnWriteArraySet<RNComponentRendererListener>()

    val isRendererAttached: Boolean
        get() = synchronized(lock) { sink != null }

    fun registerSession(sessionId: String): RNComponentSessionRegistration {
        require(sessionId.isNotBlank()) { "sessionId must not be blank" }
        val registration = RNComponentSessionRegistration(this, sessionId)
        synchronized(lock) {
            check(sessions[sessionId] == null) { "Component session '$sessionId' is already registered" }
            sessions[sessionId] = SessionEntry(registration)
        }
        return registration
    }

    fun openComponent(
        registration: RNComponentSessionRegistration,
        componentName: String,
        props: Map<String, Any?>,
        sizing: RNComponentViewSizing,
        bundleFilePath: String?,
    ): Boolean {
        require(componentName.isNotBlank()) { "componentName must not be blank" }
        synchronized(lock) {
            val entry = entryOf(registration) ?: return false
            if (entry.openEvent != null) {
                return false
            }
            val openEvent = RNComponentEvent.OpenComponent(
                registration.sessionId,
                componentName,
                props.toMap(),
                sizing,
                bundleFilePath,
            )
            entry.openEvent = openEvent
            openedSessionIds.add(registration.sessionId)
            // Emit while holding the lock so this event and a starting renderer's snapshot keep their order.
            sink?.enqueueEvent(openEvent)
            return true
        }
    }

    fun updateProps(registration: RNComponentSessionRegistration, props: Map<String, Any?>): Boolean {
        synchronized(lock) {
            val entry = entryOf(registration) ?: return false
            val openEvent = entry.openEvent ?: return false
            val updatedProps = props.toMap()
            entry.openEvent = openEvent.copy(props = updatedProps)
            sink?.enqueueEvent(
                RNComponentEvent.UpdateComponentProps(registration.sessionId, updatedProps),
            )
            return true
        }
    }

    fun closeSession(registration: RNComponentSessionRegistration) {
        synchronized(lock) {
            val entry = entryOf(registration) ?: return
            sessions.remove(registration.sessionId)
            if (entry.openEvent == null) {
                return
            }
            openedSessionIds.remove(registration.sessionId)
            sink?.enqueueEvent(RNComponentEvent.CloseComponent(registration.sessionId))
        }
    }

    /** Attaches [newSink] and sends it every open component. A repeated start from the attached sink resends them. */
    fun startDelivery(newSink: RNComponentEventSink) {
        val didAttach = synchronized(lock) {
            val attachedSink = sink
            if (attachedSink != null && attachedSink !== newSink) {
                return
            }
            sink = newSink
            for (sessionId in openedSessionIds) {
                sessions[sessionId]?.openEvent?.let(newSink::enqueueEvent)
            }
            attachedSink == null
        }
        if (didAttach) {
            notifyRendererChanged()
        }
    }

    fun detach(target: RNComponentEventSink) {
        val didDetach = synchronized(lock) {
            if (sink !== target) {
                return
            }
            sink = null
            true
        }
        if (didDetach) {
            notifyRendererChanged()
        }
    }

    /** Hands a measured size to the session's listener on the main thread. Ignored unless [fromSink] is attached. */
    fun reportContentSize(
        sessionId: String,
        width: Float,
        height: Float,
        fromSink: RNComponentEventSink,
    ) {
        if (!width.isFinite() || !height.isFinite() || width < 0 || height < 0) {
            return
        }
        val registration = synchronized(lock) {
            if (sink !== fromSink) {
                return
            }
            val entry = sessions[sessionId] ?: return
            if (entry.openEvent == null) {
                return
            }
            entry.registration
        }
        runOnMainThread(Runnable { registration.deliverContentSize(width, height) })
    }

    fun addRendererListener(listener: RNComponentRendererListener) {
        rendererListeners.add(listener)
    }

    fun removeRendererListener(listener: RNComponentRendererListener) {
        rendererListeners.remove(listener)
    }

    /** The entry of [registration], not of a later registration that reuses its session id. */
    private fun entryOf(registration: RNComponentSessionRegistration): SessionEntry? =
        sessions[registration.sessionId]?.takeIf { it.registration === registration }

    private fun notifyRendererChanged() {
        runOnMainThread(
            Runnable {
                val isAttached = isRendererAttached
                rendererListeners.forEach { it.onRendererChanged(isAttached) }
            },
        )
    }

    private class SessionEntry(
        val registration: RNComponentSessionRegistration,
    ) {
        var openEvent: RNComponentEvent.OpenComponent? = null
    }
}

/**
 * A component registered with `AppRegistry.registerComponent` that the JavaScript renderer draws into the Portal host
 * named after [sessionId]. Close it when the host view goes away; the session stays open until then.
 */
class RNComponentSessionRegistration internal constructor(
    private val store: RNComponentSessionStore,
    val sessionId: String,
) : AutoCloseable {
    /**
     * Receives the content size the renderer measured, in dp, on the main thread. The renderer does not report sizes
     * for [RNComponentViewSizing.CONSTRAINED].
     */
    @Volatile
    var contentSizeListener: RNComponentContentSizeListener? = null

    @Volatile
    private var isClosed = false

    /** Opens the component. Only the first call has an effect. [props] must contain only JSON-compatible values. */
    @JvmOverloads
    fun openComponent(
        componentName: String,
        props: Map<String, Any?>,
        sizing: RNComponentViewSizing,
        bundleFilePath: String? = null,
    ): Boolean = store.openComponent(this, componentName, props, sizing, bundleFilePath)

    /** Replaces the props of an open component. Returns `false` if the component is not open. */
    fun updateProps(props: Map<String, Any?>): Boolean = store.updateProps(this, props)

    /** Closes the component if it is open and removes the registration. */
    override fun close() {
        isClosed = true
        store.closeSession(this)
    }

    internal fun deliverContentSize(width: Float, height: Float) {
        if (isClosed) {
            return
        }
        contentSizeListener?.onContentSizeChanged(width, height)
    }
}
