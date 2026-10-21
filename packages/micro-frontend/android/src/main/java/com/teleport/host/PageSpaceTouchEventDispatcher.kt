package com.teleport.host

import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import com.facebook.react.uimanager.events.TouchEvent

/**
 * Hands touches to [delegate] in the page space of the surface, [pageOffsetX] and [pageOffsetY]
 * pixels from the root that dispatched them.
 *
 * `JSTouchDispatcher` hit-tests a touch and builds its [TouchEvent] from the same `MotionEvent`, so
 * `pageX`/`pageY` come out relative to the dispatching root. This moves the event's own copy of the
 * `MotionEvent` after hit-testing and before JS reads it. `locationX`/`locationY` do not move:
 * `TouchesHelper` takes them as the distance from the target view, which the move leaves as it was.
 */
internal class PageSpaceTouchEventDispatcher(
  private val delegate: EventDispatcher,
  private val pageOffsetX: Float,
  private val pageOffsetY: Float,
) : EventDispatcher by delegate {
  override fun dispatchEvent(event: Event<*>) {
    if (event is TouchEvent) {
      event.getMotionEvent().offsetLocation(pageOffsetX, pageOffsetY)
    }
    delegate.dispatchEvent(event)
  }
}
