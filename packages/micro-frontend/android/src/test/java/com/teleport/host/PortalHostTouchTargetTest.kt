@file:Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")

package com.teleport.host

import android.content.Context
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.ReactHost
import com.facebook.react.bridge.CatalystInstance
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsForTests
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.BatchEventDispatchedListener
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import com.facebook.react.uimanager.events.EventDispatcherListener
import com.facebook.react.uimanager.events.TouchEvent
import com.facebook.react.views.view.ReactViewGroup
import org.junit.Assert.assertEquals
import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], manifest = Config.NONE)
class PortalHostTouchTargetTest {
  @Test
  fun `root view uses its surface id as the Android touch fallback id`() {
    val root = createRootView()

    assertEquals(SURFACE_ID, root.getRootViewTag())
    assertEquals(SURFACE_ID, root.id)
  }

  @Test
  fun `native host keeps empty portal taps on one root touch stream`() {
    val events = CapturingEventDispatcher()
    val root = createRootView(events)
    val host = PortalHostView(root.context)
    root.addView(host, ViewGroup.LayoutParams(SIZE, SIZE))
    layout(root, host, left = HOST_LEFT, top = HOST_TOP)

    dispatchTap(root, x = HOST_LEFT + 10f, y = HOST_TOP + 20f)

    assertEquals(View.NO_ID, host.id)
    assertOneTouchStream(events)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.viewTags)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.surfaceIds)
    assertEquals(listOf(10f, 10f), events.viewXs)
    assertEquals(listOf(20f, 20f), events.viewYs)
  }

  @Test
  fun `native host keeps a stable Android resource id out of the JS touch target`() {
    val events = CapturingEventDispatcher()
    val root = createRootView(events)
    val host = PortalHostView(root.context).apply { id = android.R.id.content }
    root.addView(host, ViewGroup.LayoutParams(SIZE, SIZE))
    layout(root, host, left = HOST_LEFT, top = HOST_TOP)

    dispatchTap(root, x = HOST_LEFT + 10f, y = HOST_TOP + 20f)

    assertEquals(android.R.id.content, host.id)
    assertOneTouchStream(events)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.viewTags)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.surfaceIds)
    assertEquals(listOf(10f, 10f), events.viewXs)
    assertEquals(listOf(20f, 20f), events.viewYs)
  }

  @Test
  fun `native host keeps a generated Android id out of the JS touch target`() {
    val events = CapturingEventDispatcher()
    val root = createRootView(events)
    val generatedId = View.generateViewId()
    val host = PortalHostView(root.context).apply { id = generatedId }
    root.addView(host, ViewGroup.LayoutParams(SIZE, SIZE))
    layout(root, host)

    dispatchTap(root)

    assertEquals(generatedId, host.id)
    assertOneTouchStream(events)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.viewTags)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.surfaceIds)
  }

  @Test
  fun `teleported React child stays on one child touch stream inside the native host`() {
    val events = CapturingEventDispatcher()
    val root = createRootView(events)
    val host = PortalHostView(root.context).apply { id = android.R.id.content }
    val child = ReactViewGroup(createThemedContext()).apply { id = CHILD_TAG }
    root.addView(host, ViewGroup.LayoutParams(SIZE, SIZE))
    host.addView(child, ViewGroup.LayoutParams(SIZE, SIZE))
    layout(root, host, child)

    dispatchTap(root)

    assertEquals(android.R.id.content, host.id)
    assertOneTouchStream(events)
    assertEquals(listOf(CHILD_TAG, CHILD_TAG), events.viewTags)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.surfaceIds)
  }

  @Test
  fun `RN managed host keeps the default box none pointer events`() {
    val host =
        PortalHostViewManager().createViewInstance(createThemedContext()) as PortalHostView

    assertEquals(PointerEvents.BOX_NONE, host.pointerEvents)
  }

  @Test
  fun `RN managed host with explicit auto keeps its own React tag for empty host touches`() {
    val events = CapturingEventDispatcher()
    val root = createRootView(events)
    val manager = PortalHostViewManager()
    val host = manager.createViewInstance(createThemedContext()) as PortalHostView
    host.id = MANAGED_HOST_TAG
    manager.setPointerEvents(host, "auto")
    root.addView(host, ViewGroup.LayoutParams(SIZE, SIZE))
    layout(root, host)

    dispatchTap(root)

    assertOneTouchStream(events)
    assertEquals(listOf(MANAGED_HOST_TAG, MANAGED_HOST_TAG), events.viewTags)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.surfaceIds)
  }

  @Test
  fun `RN managed host with explicit box only keeps its own React tag for empty host touches`() {
    val events = CapturingEventDispatcher()
    val root = createRootView(events)
    val manager = PortalHostViewManager()
    val host = manager.createViewInstance(createThemedContext()) as PortalHostView
    host.id = MANAGED_HOST_TAG
    manager.setPointerEvents(host, "box-only")
    root.addView(host, ViewGroup.LayoutParams(SIZE, SIZE))
    layout(root, host)

    dispatchTap(root)

    assertOneTouchStream(events)
    assertEquals(listOf(MANAGED_HOST_TAG, MANAGED_HOST_TAG), events.viewTags)
    assertEquals(listOf(SURFACE_ID, SURFACE_ID), events.surfaceIds)
  }

  private fun createRootView(events: EventDispatcher = CapturingEventDispatcher()): PortalReactRootView {
    val reactApplicationContext = createReactApplicationContext(events)
    val reactHost = mock(ReactHost::class.java)
    org.mockito.Mockito.`when`(reactHost.currentReactContext).thenReturn(reactApplicationContext)
    return PortalReactRootView(
        createThemedContext(reactApplicationContext),
        reactHost,
        SURFACE_ID,
        MODULE_NAME,
    )
  }

  private fun createThemedContext(
      reactApplicationContext: ReactApplicationContext = createReactApplicationContext()
  ): ThemedReactContext =
      ThemedReactContext(
          reactApplicationContext,
          baseContext(),
          MODULE_NAME,
          SURFACE_ID,
      )

  private fun createReactApplicationContext(
      events: EventDispatcher = CapturingEventDispatcher()
  ): ReactApplicationContext {
    val reactApplicationContext = mock(ReactApplicationContext::class.java)
    val uiManager = mock(UIManager::class.java)
    val catalystInstance = mock(CatalystInstance::class.java)
    org.mockito.Mockito.`when`(reactApplicationContext.hasCatalystInstance()).thenReturn(true)
    org.mockito.Mockito.`when`(reactApplicationContext.hasActiveReactInstance()).thenReturn(true)
    org.mockito.Mockito.`when`(reactApplicationContext.catalystInstance).thenReturn(catalystInstance)
    org.mockito.Mockito.`when`(reactApplicationContext.fabricUIManager).thenReturn(uiManager)
    org.mockito.Mockito.`when`(uiManager.eventDispatcher).thenReturn(events)
    return reactApplicationContext
  }

  private class CapturingEventDispatcher : EventDispatcher {
    val names = mutableListOf<String>()
    val viewTags = mutableListOf<Int>()
    val surfaceIds = mutableListOf<Int>()
    val viewXs = mutableListOf<Float>()
    val viewYs = mutableListOf<Float>()

    override fun dispatchEvent(event: Event<*>) {
      names += event.eventName
      viewTags += event.viewTag
      surfaceIds += event.surfaceId
      if (event is TouchEvent) {
        viewXs += event.viewX
        viewYs += event.viewY
      }
    }

    override fun dispatchAllEvents() = Unit

    override fun addListener(listener: EventDispatcherListener) = Unit

    override fun removeListener(listener: EventDispatcherListener) = Unit

    override fun addBatchEventDispatchedListener(listener: BatchEventDispatchedListener) = Unit

    override fun removeBatchEventDispatchedListener(listener: BatchEventDispatchedListener) = Unit

    override fun onCatalystInstanceDestroyed() = Unit
  }

  private companion object {
    const val MODULE_NAME = "TestSurface"
    const val SURFACE_ID = 42
    const val CHILD_TAG = 101
    const val MANAGED_HOST_TAG = 202
    const val SIZE = 300
    const val HOST_LEFT = 30
    const val HOST_TOP = 40

    @JvmStatic
    @BeforeClass
    fun setUpFeatureFlags() {
      ReactNativeFeatureFlagsForTests.setUp()
    }

    fun baseContext(): Context = ApplicationProvider.getApplicationContext()

    fun layout(
        root: ViewGroup,
        vararg descendants: View,
        left: Int = 0,
        top: Int = 0,
    ) {
      root.layout(0, 0, SIZE, SIZE)
      descendants.forEach { it.layout(left, top, left + SIZE, top + SIZE) }
    }

    fun dispatchTap(
        root: View,
        x: Float = 10f,
        y: Float = 10f,
    ) {
      val down = MotionEvent.obtain(0, 0, MotionEvent.ACTION_DOWN, x, y, 0)
      val up = MotionEvent.obtain(0, 16, MotionEvent.ACTION_UP, x, y, 0)
      try {
        root.dispatchTouchEvent(down)
        root.dispatchTouchEvent(up)
      } finally {
        down.recycle()
        up.recycle()
      }
    }

    fun assertOneTouchStream(events: CapturingEventDispatcher) {
      assertEquals(listOf("topTouchStart", "topTouchEnd"), events.names)
    }
  }
}
