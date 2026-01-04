package run.granite.lottie

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

/**
 * Event emitted when animation is loaded
 */
class GraniteLottieLoadedEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteLottieLoadedEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onAnimationLoaded"

    override fun getEventData(): WritableMap = Arguments.createMap()
}

/**
 * Event emitted when animation finishes
 */
class GraniteLottieFinishEvent(
    surfaceId: Int,
    viewId: Int,
    private val isCancelled: Boolean
) : Event<GraniteLottieFinishEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onAnimationFinish"

    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putBoolean("isCancelled", isCancelled)
    }
}

/**
 * Event emitted when animation fails to load
 */
class GraniteLottieFailureEvent(
    surfaceId: Int,
    viewId: Int,
    private val error: String
) : Event<GraniteLottieFailureEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onAnimationFailure"

    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putString("error", error)
    }
}

/**
 * Event emitted when animation loops
 */
class GraniteLottieLoopEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteLottieLoopEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onAnimationLoop"

    override fun getEventData(): WritableMap = Arguments.createMap()
}
