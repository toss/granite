package run.granite.video.event

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter

/**
 * Interface for dispatching video events to React Native.
 * Abstracted to allow for testability.
 */
interface VideoEventDispatcher {
    /**
     * Dispatch an event to React Native.
     * @param viewId The view ID to dispatch the event for.
     * @param eventName The name of the event.
     * @param event The event data.
     */
    fun dispatchEvent(viewId: Int, eventName: String, event: WritableMap?)
}

/**
 * Default implementation using React Native's RCTEventEmitter.
 */
class RCTVideoEventDispatcher(
    private val context: ThemedReactContext
) : VideoEventDispatcher {

    override fun dispatchEvent(viewId: Int, eventName: String, event: WritableMap?) {
        context.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(viewId, eventName, event)
    }
}

/**
 * Factory interface for creating VideoEventDispatcher instances.
 */
interface VideoEventDispatcherFactory {
    /**
     * Create a VideoEventDispatcher for the given context.
     * @param context The themed React context.
     * @return A new VideoEventDispatcher instance.
     */
    fun create(context: ThemedReactContext): VideoEventDispatcher
}

/**
 * Default factory implementation.
 */
class DefaultVideoEventDispatcherFactory : VideoEventDispatcherFactory {
    override fun create(context: ThemedReactContext): VideoEventDispatcher {
        return RCTVideoEventDispatcher(context)
    }
}
