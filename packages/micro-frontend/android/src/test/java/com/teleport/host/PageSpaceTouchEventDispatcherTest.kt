package com.teleport.host

import android.view.MotionEvent
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import com.facebook.react.uimanager.events.TouchEvent
import org.junit.Test
import org.mockito.Mockito.inOrder
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.Mockito.`when`

/**
 * `TouchesHelper` reports a touch's `pageX`/`pageY` straight from the copied [MotionEvent] and its
 * `locationX`/`locationY` as the offset from the target view, so moving the copy moves only the
 * page coordinates. `JSTouchDispatcher` has already hit-tested the original event by then.
 */
class PageSpaceTouchEventDispatcherTest {
  private val delegate = mock(EventDispatcher::class.java)
  private val dispatcher = PageSpaceTouchEventDispatcher(delegate, pageOffsetX = 12f, pageOffsetY = 340f)

  @Test
  fun `moves a touch into the page space before handing it on`() {
    val motionEvent = mock(MotionEvent::class.java)
    val touchEvent = mock(TouchEvent::class.java)
    `when`(touchEvent.getMotionEvent()).thenReturn(motionEvent)

    dispatcher.dispatchEvent(touchEvent)

    val order = inOrder(motionEvent, delegate)
    order.verify(motionEvent).offsetLocation(12f, 340f)
    order.verify(delegate).dispatchEvent(touchEvent)
  }

  @Test
  fun `hands other events on untouched`() {
    val event = mock(Event::class.java)

    dispatcher.dispatchEvent(event)

    verify(delegate).dispatchEvent(event)
    verifyNoInteractions(event)
  }

  @Test
  fun `leaves everything else to the delegate`() {
    dispatcher.dispatchAllEvents()

    verify(delegate).dispatchAllEvents()
  }
}
