package run.granite.video.event

import android.view.View
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher

/**
 * Interface for dispatching video events to React Native.
 * Uses modern Event-based dispatching compatible with RN 0.84+.
 */
interface VideoEventDispatcher {
    /**
     * Dispatch an event to React Native.
     * @param event The Event object to dispatch.
     */
    fun dispatchEvent(event: Event<*>)

    /**
     * Get the surface ID for creating events.
     * @return The surface ID for this view.
     */
    fun getSurfaceId(): Int
}

/**
 * Modern implementation using UIManagerHelper EventDispatcher.
 * Compatible with React Native 0.84+.
 */
class ModernVideoEventDispatcher(
    private val view: View
) : VideoEventDispatcher {

    private fun getEventDispatcher(): EventDispatcher? {
        val reactContext = view.context as? ReactContext ?: return null
        return UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.id)
    }

    override fun dispatchEvent(event: Event<*>) {
        getEventDispatcher()?.dispatchEvent(event)
    }

    override fun getSurfaceId(): Int = UIManagerHelper.getSurfaceId(view)
}

/**
 * Factory interface for creating VideoEventDispatcher instances.
 */
interface VideoEventDispatcherFactory {
    /**
     * Create a VideoEventDispatcher for the given view.
     * @param view The view to dispatch events for.
     * @return A new VideoEventDispatcher instance.
     */
    fun create(view: View): VideoEventDispatcher
}

/**
 * Default factory implementation.
 */
class DefaultVideoEventDispatcherFactory : VideoEventDispatcherFactory {
    override fun create(view: View): VideoEventDispatcher {
        return ModernVideoEventDispatcher(view)
    }
}
