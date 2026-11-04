package run.granite.rncomponentview

import android.os.Handler
import android.os.Looper

/** The component sessions of the app. [RNComponentView] uses them; register one directly for a custom container. */
object RNComponentSessions {
    private val mainHandler by lazy { Handler(Looper.getMainLooper()) }
    private val store = RNComponentSessionStore { mainHandler.post(it) }

    /**
     * Registers a component session. Throws if [sessionId] is already registered: use a unique id per Portal host and
     * close the previous registration before reusing its id.
     */
    @JvmStatic
    fun registerSession(sessionId: String): RNComponentSessionRegistration = store.registerSession(sessionId)

    /** Whether a JavaScript renderer receives component sessions. */
    @JvmStatic
    val isRendererAttached: Boolean
        get() = store.isRendererAttached

    @JvmStatic
    fun addRendererListener(listener: RNComponentRendererListener) = store.addRendererListener(listener)

    @JvmStatic
    fun removeRendererListener(listener: RNComponentRendererListener) = store.removeRendererListener(listener)

    @JvmSynthetic
    internal fun startEventDelivery(sink: RNComponentEventSink) = store.startDelivery(sink)

    @JvmSynthetic
    internal fun detach(sink: RNComponentEventSink) = store.detach(sink)

    @JvmSynthetic
    internal fun reportContentSize(sessionId: String, width: Float, height: Float, fromSink: RNComponentEventSink) =
        store.reportContentSize(sessionId, width, height, fromSink)
}
