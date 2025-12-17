package com.graniteimage

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

/**
 * Event emitted when image loading starts
 */
class GraniteImageLoadStartEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteImageLoadStartEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onGraniteLoadStart"

    override fun getEventData(): WritableMap = Arguments.createMap()
}

/**
 * Event emitted during image loading progress
 */
class GraniteImageProgressEvent(
    surfaceId: Int,
    viewId: Int,
    private val loaded: Int,
    private val total: Int
) : Event<GraniteImageProgressEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onGraniteProgress"

    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putInt("loaded", loaded)
        putInt("total", total)
    }
}

/**
 * Event emitted when image loading completes successfully
 */
class GraniteImageLoadEvent(
    surfaceId: Int,
    viewId: Int,
    private val width: Int,
    private val height: Int
) : Event<GraniteImageLoadEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onGraniteLoad"

    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putInt("width", width)
        putInt("height", height)
    }
}

/**
 * Event emitted when image loading fails
 */
class GraniteImageErrorEvent(
    surfaceId: Int,
    viewId: Int,
    private val error: String
) : Event<GraniteImageErrorEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onGraniteError"

    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putString("error", error)
    }
}

/**
 * Event emitted when image loading ends (success or failure)
 */
class GraniteImageLoadEndEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteImageLoadEndEvent>(surfaceId, viewId) {

    override fun getEventName(): String = "onGraniteLoadEnd"

    override fun getEventData(): WritableMap = Arguments.createMap()
}
