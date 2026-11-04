package run.granite.rncomponentview

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.ContextWrapper
import android.content.res.Configuration
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.ReactHost
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.teleport.host.PortalHostView
import com.teleport.host.PortalReactRootView
import java.util.UUID

/**
 * Shows a React Native component registered with `AppRegistry.registerComponent` inside a native view.
 *
 * The JavaScript component renderer (`RNComponentViewRenderer`) draws the component into a Portal host inside
 * this view. The view opens a component session the first time it is attached to a window and closes it on [close] or
 * when the Activity of its context is destroyed; a view without an Activity context must be closed with [close].
 * Detaching from the window does not close the session: the Portal takes the content back and returns it when the view
 * is attached again.
 *
 * The Portal host sits under a React root of the surface that renders the components, which dispatches touches to
 * JavaScript. Call [activate] with that surface once it has started.
 *
 * Sizing: a Portal passes the host size to the React layout but never reports the content size back, so the renderer
 * measures the content and reports it to this view.
 * - [RNComponentViewSizing.CONTENT_HEIGHT]: the layout sets the width, and the height follows the content.
 * - [RNComponentViewSizing.CONTENT_SIZE]: the width and the height follow the content.
 * - [RNComponentViewSizing.CONSTRAINED]: the layout sets both, and the content fills the view.
 *
 * Before the first measurement a content-sized view takes a 48 dp placeholder size, because the Portal lays content
 * out only in a host whose width and height are both non-zero. [placeholderView] covers the view until the content
 * attaches and, for content-sized views, until the renderer measures it.
 */
class RNComponentView @JvmOverloads constructor(
    context: Context,
    val componentName: String,
    props: Map<String, Any?>,
    val sizing: RNComponentViewSizing,
    private val bundleFilePath: String? = null,
) : FrameLayout(context) {
    /** Host hooks, called on the main thread. */
    interface Listener {
        /**
         * Asked once, when the view is first attached to a window, right before it opens its component session.
         * Return `false` to leave the view empty; it then never opens a session.
         */
        fun shouldOpenSession(view: RNComponentView): Boolean = true

        /** The view opened its component session. */
        fun onSessionOpened(view: RNComponentView) = Unit

        /** The renderer measured a new content size, in dp. Not called for [RNComponentViewSizing.CONSTRAINED]. */
        fun onContentSizeChanged(view: RNComponentView, contentSize: ContentSize) = Unit
    }

    /** A content size in dp. */
    data class ContentSize(val width: Float, val height: Float)

    private enum class SessionState {
        /** The view has not been attached to a window yet. */
        NOT_OPENED,

        /** The session closes on [close] or when the Activity is destroyed. */
        OPENED,

        /** The listener declined to open the session. The view stays empty. */
        DECLINED,

        /** The session was closed. The view stays empty. */
        CLOSED,
    }

    var listener: Listener? = null

    /** Identifies the component session and names the Portal host the renderer draws into. */
    val sessionId: String = UUID.randomUUID().toString()

    /** The last content size the renderer reported, or `null` before the first report. */
    var contentSize: ContentSize? = null
        private set

    /** The default placeholder color last applied, which depends on light or dark mode. */
    private var defaultPlaceholderColor = context.getColor(R.color.granite_rn_component_view_placeholder)

    /**
     * Covers the view until the content is ready. Its default color follows light and dark mode. Style it to match the
     * host app.
     */
    val placeholderView: View = View(context).apply { setBackgroundColor(defaultPlaceholderColor) }

    /**
     * Set when the host knows the content cannot show, for example because no renderer attached to the current
     * runtime. An unavailable view shows nothing and collapses its content-sized dimensions.
     */
    var isUnavailable: Boolean = false
        set(value) {
            if (field == value) {
                return
            }
            field = value
            updateContentVisibility()
            requestLayout()
        }

    private var props: Map<String, Any?> = props.toMap()
    private var sessionState = SessionState.NOT_OPENED
    private var registration: RNComponentSessionRegistration? = null
    private var reactRootView: PortalReactRootView? = null
    private var portalHostView: PortalHostView? = null
    private var activityDestroyObserver: ActivityDestroyObserver? = null

    private val isEmpty: Boolean
        get() = when (sessionState) {
            SessionState.NOT_OPENED, SessionState.OPENED -> isUnavailable
            SessionState.DECLINED, SessionState.CLOSED -> true
        }

    init {
        addView(placeholderView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    /** Replaces the props. Before the session opens, the view opens it with the latest props. */
    fun updateProps(props: Map<String, Any?>) {
        this.props = props.toMap()
        registration?.updateProps(this.props)
    }

    /**
     * Hosts the Portal under a React root of the surface [surfaceId], registered as [moduleName], that renders the
     * components. Returns `false` while [reactHost] has no running React instance or the surface has not started; call
     * again once both are true. No-op when already active. Call on the main thread.
     *
     * A surface has id 0 until it starts, and [reactHost] can report its instance running before it starts the surfaces
     * waiting for it. The renderer runs inside the surface, so the surface has started once
     * [RNComponentSessions.isRendererAttached] is `true`.
     */
    fun activate(reactHost: ReactHost, surfaceId: Int, moduleName: String): Boolean {
        UiThreadUtil.assertOnUiThread()
        if (reactRootView != null) {
            return true
        }
        val reactApplicationContext = reactHost.currentReactContext as? ReactApplicationContext ?: return false
        if (!reactApplicationContext.hasActiveReactInstance()) {
            return false
        }
        // A root for id 0 would send every touch to a surface that does not exist.
        if (surfaceId <= 0) {
            return false
        }
        val themedReactContext = ThemedReactContext(reactApplicationContext, context, moduleName, surfaceId)
        val hostView = PortalHostView(themedReactContext).apply {
            onChildCountChanged = { updateContentVisibility() }
            setName(if (sessionState == SessionState.CLOSED) null else sessionId)
        }
        // The surface keeps its own layout constraints: the Portal sizes the content from the host.
        val rootView = PortalReactRootView(
            themedReactContext,
            reactHost,
            surfaceId,
            moduleName,
            updatesSurfaceLayout = false,
        ).apply {
            addView(hostView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        }
        portalHostView = hostView
        reactRootView = rootView
        addView(rootView, 0, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        updateContentVisibility()
        return true
    }

    /** Closes the component session and stops hosting its content. The view stays empty afterwards. */
    fun close() {
        if (sessionState == SessionState.CLOSED) {
            return
        }
        sessionState = SessionState.CLOSED
        registration?.close()
        registration = null
        activityDestroyObserver?.stop()
        activityDestroyObserver = null
        portalHostView?.setName(null)
        updateContentVisibility()
        requestLayout()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        // A detached view misses configuration changes.
        updateDefaultPlaceholderColor()
        openSessionIfNeeded()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        updateDefaultPlaceholderColor()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val density = resources.displayMetrics.density
        val contentWidth = RNComponentViewLayout.contentWidthPx(sizing, isEmpty, contentSize, density)
        val contentHeight = RNComponentViewLayout.contentHeightPx(sizing, isEmpty, contentSize, density)
        val width = contentWidth?.let { resolveSize(it, widthMeasureSpec) }
            ?: getDefaultSize(suggestedMinimumWidth, widthMeasureSpec)
        val height = contentHeight?.let { resolveSize(it, heightMeasureSpec) }
            ?: getDefaultSize(suggestedMinimumHeight, heightMeasureSpec)
        setMeasuredDimension(width, height)

        val childWidthMeasureSpec = MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY)
        val childHeightMeasureSpec = MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        for (index in 0 until childCount) {
            getChildAt(index).measure(childWidthMeasureSpec, childHeightMeasureSpec)
        }
    }

    private fun openSessionIfNeeded() {
        if (sessionState != SessionState.NOT_OPENED) {
            return
        }
        if (listener?.shouldOpenSession(this) == false) {
            sessionState = SessionState.DECLINED
            updateContentVisibility()
            requestLayout()
            return
        }

        val registration = RNComponentSessions.registerSession(sessionId)
        this.registration = registration
        sessionState = SessionState.OPENED
        registration.contentSizeListener = RNComponentContentSizeListener { width, height ->
            contentSizeDidChange(ContentSize(width, height))
        }
        registration.openComponent(componentName, props, sizing, bundleFilePath)
        activityDestroyObserver = context.findActivity()?.let { ActivityDestroyObserver(it, ::close) }

        listener?.onSessionOpened(this)
        updateContentVisibility()
    }

    private fun contentSizeDidChange(contentSize: ContentSize) {
        if (this.contentSize == contentSize) {
            return
        }
        this.contentSize = contentSize
        updateContentVisibility()
        when (sizing) {
            RNComponentViewSizing.CONTENT_HEIGHT,
            RNComponentViewSizing.CONTENT_SIZE,
            -> {
                requestLayout()
                listener?.onContentSizeChanged(this, contentSize)
            }
            RNComponentViewSizing.CONSTRAINED -> Unit
        }
    }

    private fun updateContentVisibility() {
        val isEmpty = isEmpty
        val hasAttachedContent = (portalHostView?.childCount ?: 0) > 0
        // Keep the root laid out while hidden, so the Portal host keeps a size for its content.
        reactRootView?.visibility = if (isEmpty) INVISIBLE else VISIBLE
        val showsPlaceholder =
            RNComponentViewLayout.showsPlaceholder(sizing, isEmpty, hasAttachedContent, contentSize != null)
        placeholderView.visibility = if (showsPlaceholder) VISIBLE else GONE
    }

    /** Applies the default placeholder color for the current light or dark mode, unless the host restyled it. */
    private fun updateDefaultPlaceholderColor() {
        // setBackgroundColor recolors the same ColorDrawable, so compare colors rather than drawables.
        if ((placeholderView.background as? ColorDrawable)?.color != defaultPlaceholderColor) {
            return
        }
        defaultPlaceholderColor = context.getColor(R.color.granite_rn_component_view_placeholder)
        placeholderView.setBackgroundColor(defaultPlaceholderColor)
    }

    /** Closes the session when [activity] is destroyed, including a configuration change: the view goes with it. */
    private class ActivityDestroyObserver(
        private val activity: Activity,
        private val onDestroyed: () -> Unit,
    ) : Application.ActivityLifecycleCallbacks {
        init {
            activity.application.registerActivityLifecycleCallbacks(this)
        }

        fun stop() {
            activity.application.unregisterActivityLifecycleCallbacks(this)
        }

        override fun onActivityDestroyed(target: Activity) {
            if (target === activity) {
                onDestroyed()
            }
        }

        override fun onActivityCreated(target: Activity, savedInstanceState: Bundle?) = Unit
        override fun onActivityStarted(target: Activity) = Unit
        override fun onActivityResumed(target: Activity) = Unit
        override fun onActivityPaused(target: Activity) = Unit
        override fun onActivityStopped(target: Activity) = Unit
        override fun onActivitySaveInstanceState(target: Activity, outState: Bundle) = Unit
    }

    private companion object {
        fun Context.findActivity(): Activity? {
            var current: Context? = this
            while (current is ContextWrapper) {
                if (current is Activity) {
                    return current
                }
                current = current.baseContext
            }
            return null
        }
    }
}
