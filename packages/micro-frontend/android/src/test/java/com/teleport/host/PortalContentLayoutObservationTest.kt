package com.teleport.host

import android.app.Activity
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.R
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.teleport.initialcontent.PortalInitialContentMounts
import com.teleport.initialcontent.PortalInitialContentViewManager
import com.teleport.initialcontent.PortalInitialContentRegistry
import com.teleport.initialcontent.PortalInitialContentView
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.*
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], manifest = Config.NONE)
class PortalContentLayoutObservationTest {
  private lateinit var controller: ActivityController<Activity>
  private lateinit var container: FrameLayout
  private lateinit var host: PortalHostView
  private lateinit var viewManager: PortalInitialContentViewManager
  private var commitNumber = 0
  private val markers = mutableListOf<PortalInitialContentView>()

  @Before
  fun setUp() {
    controller = Robolectric.buildActivity(Activity::class.java).setup().visible()
    container = FrameLayout(controller.get())
    controller.get().setContentView(container)
    host = PortalHostView(controller.get())
    container.addView(host)
    PortalInitialContentMounts.install()
    mockStatic(ReactNativeFeatureFlags::class.java).use { flags ->
      flags.`when`<Boolean> { ReactNativeFeatureFlags.enableViewRecyclingForView() }.thenReturn(false)
      viewManager = PortalInitialContentViewManager()
    }
    drain()
  }

  @After
  fun tearDown() {
    host.cleanup()
    markers.forEach { it.dispose() }
    begin()
    end()
    controller.pause().stop().destroy()
    drain()
    assertTrue(PortalInitialContentRegistry.observers.isEmpty())
  }

  @Test
  fun `ordinary View props retain ReactViewManager behavior`() {
    val marker = marker()
    viewManager.updateProperties(marker, ReactStylesDiffMap(JavaOnlyMap.of(
      "pointerEvents", "none", "accessible", true,
    )))
    assertEquals(PointerEvents.NONE, marker.pointerEvents)
    assertTrue(marker.isFocusable)
  }

  @Test
  fun `clipped sentinel retains logical Fabric membership`() {
    val marker = marker()
    viewManager.updateProperties(marker, ReactStylesDiffMap(JavaOnlyMap.of("removeClippedSubviews", true)))
    assertTrue(marker.removeClippedSubviews)
    begin()
    insertSentinel(marker)
    end()
    assertEquals(1, viewManager.getChildCount(marker))
    assertNull(requireNotNull(viewManager.getChildAt(marker, 0)).parent)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `layout and pre draw never substitute for mount completion`() {
    val marker = marker()
    marker.addView(View(controller.get()))
    marker.layout(0, 0, 100, 100)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    host.viewTreeObserver.dispatchOnPreDraw()
    drain()
    assertEquals(0, calls)
    ReactMarker.logFabricMarker(ReactMarkerConstants.FABRIC_COMMIT_END, null, 99, 0L)
    drain()
    assertEquals(0, calls)
    complete(marker)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `explicit empty hidden zero size marker completes without visual heuristics`() {
    val marker = marker()
    marker.visibility = View.INVISIBLE
    marker.alpha = 0f
    marker.forceLayout()
    assertEquals(0, marker.width)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    complete(marker)
    drain()
    assertEquals(1, calls)
    complete(marker)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `preallocated marker cannot acknowledge an unrelated mount batch`() {
    val marker = marker(attach = false)
    begin()
    end()
    assertFalse(marker.hasCompletedMount())
    host.addView(marker)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    drain()
    assertEquals(0, calls)
    complete(marker)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `late subscriber uses completed native instance without another frame`() {
    complete(marker())
    drain()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    assertEquals(0, calls)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `mount before destination attachment completes after attachment`() {
    container.removeView(host)
    val marker = marker()
    complete(marker)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    drain()
    assertEquals(0, calls)
    container.addView(host)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `identity update cannot reuse an older completed mount`() {
    val marker = marker(key = "old")
    complete(marker)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    marker.setTag(R.id.view_tag_native_id, "granite:portal-initial-content:2:request")
    drain()
    assertEquals(0, calls)
    complete(marker)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `revision mismatch waits for matching committed identity`() {
    val marker = marker(revision = 3)
    complete(marker)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    drain()
    assertEquals(0, calls)
    marker.setTag(R.id.view_tag_native_id, "granite:portal-initial-content:2:request")
    complete(marker)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `new mount invalidates queued completion until transaction ends`() {
    val marker = marker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    complete(marker)
    begin()
    PortalInitialContentMounts.recordMutation(marker)
    drain()
    assertEquals(0, calls)
    end()
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `replacement instance cannot reuse removed marker acknowledgment`() {
    val old = marker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    complete(old)
    host.removeView(old)
    old.dispose()
    val replacement = marker()
    drain()
    assertEquals(0, calls)
    complete(replacement)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `uncommitted duplicate prevents ambiguous delivery`() {
    val first = marker()
    val duplicate = marker()
    complete(first)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    drain()
    assertEquals(0, calls)
    host.removeView(duplicate)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `ordinary view with matching nativeID has no Fabric acknowledgment`() {
    host.addView(View(controller.get()).apply {
      setTag(R.id.view_tag_native_id, "granite:portal-initial-content:2:request")
    })
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    drain()
    assertEquals(0, calls)
  }

  @Test
  fun `close is idempotent and cancels queued delivery`() {
    val marker = marker()
    var calls = 0
    val observation = host.observeContentLayout("request", 2) { calls++ }
    complete(marker)
    observation.close()
    observation.close()
    drain()
    assertEquals(0, calls)
  }

  @Test
  fun `cleanup rename and detach cancel pending observations`() {
    val marker = marker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    host.cleanup()
    host.observeContentLayout("request", 2) { calls++ }
    host.setName("other")
    host.observeContentLayout("request", 2) { calls++ }
    container.removeView(host)
    container.addView(host)
    complete(marker)
    drain()
    assertEquals(0, calls)
  }

  @Test
  fun `resize and unchanged name preserve pending observation`() {
    host.setName("same")
    val marker = marker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    host.layout(0, 0, 200, 300)
    host.layout(0, 0, 300, 400)
    host.setName("same")
    complete(marker)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `physical host owns completion after reparenting`() {
    val marker = marker()
    val destination = PortalHostView(controller.get())
    container.addView(destination)
    var first = 0
    var second = 0
    host.observeContentLayout("request", 2) { first++ }
    destination.observeContentLayout("request", 2) { second++ }
    complete(marker)
    host.removeView(marker)
    destination.addView(marker)
    drain()
    assertEquals(0, first)
    assertEquals(1, second)
    destination.cleanup()
  }

  @Test
  fun `disposal invalidates acknowledgment and removes the native instance`() {
    val marker = marker()
    complete(marker)
    marker.dispose()
    assertFalse(marker.hasCompletedMount())
    assertFalse(PortalInitialContentRegistry.markers.contains(marker))
  }

  @Test
  fun `unrelated batch cannot complete a parented marker`() {
    val first = marker(key = "first")
    val second = marker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    complete(first)
    drain()
    assertEquals(0, calls)
    assertFalse(second.hasCompletedMount())
    complete(second)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `aborted batch is not acknowledged by a later unrelated batch`() {
    val marker = marker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    begin()
    insertSentinel(marker)
    // Missing END: execution aborted. Another surface may reuse the same commit number.
    ReactMarker.logFabricMarker(ReactMarkerConstants.FABRIC_BATCH_EXECUTION_START, null, commitNumber, 0L)
    end()
    drain()
    assertEquals(0, calls)
    assertFalse(marker.hasCompletedMount())
    complete(marker)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `unmatched end cannot certify a different transaction`() {
    val marker = marker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    begin()
    insertSentinel(marker)
    ReactMarker.logFabricMarker(ReactMarkerConstants.FABRIC_BATCH_EXECUTION_END, null, commitNumber + 1, 0L)
    drain()
    assertEquals(0, calls)
    end()
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `sentinel removal cannot positively acknowledge content`() {
    val marker = marker()
    complete(marker)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    begin()
    viewManager.removeViewAt(marker, 0)
    end()
    drain()
    assertEquals(0, calls)
    begin()
    viewManager.addView(marker, View(controller.get()), 0)
    end()
    drain()
    assertEquals(0, calls)
    begin()
    insertSentinel(marker)
    end()
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `sync prop updates outside a mount do not erase an applied acknowledgment`() {
    val marker = marker()
    complete(marker)
    PortalInitialContentMounts.recordMutation(marker)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `completed content moved to a destination later delivers without another Fabric mount`() {
    val marker = marker(attach = false)
    container.addView(marker)
    complete(marker)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    drain()
    assertEquals(0, calls)
    container.removeView(marker)
    host.addView(marker)
    drain()
    assertEquals(1, calls)
  }

  @Test
  fun `callback may reenter observation safely`() {
    complete(marker())
    var calls = 0
    host.observeContentLayout("request", 2) {
      calls++
      host.observeContentLayout("request", 2) { calls++ }
    }
    drain()
    assertEquals(2, calls)
  }

  @Test
  fun `invalid request identity is rejected`() {
    assertThrows(IllegalArgumentException::class.java) { host.observeContentLayout("", 0) {} }
    assertThrows(IllegalArgumentException::class.java) { host.observeContentLayout("request", -1) {} }
  }

  private fun marker(key: String = "request", revision: Int = 2, attach: Boolean = true) =
    PortalInitialContentView(controller.get()).also {
      markers.add(it)
      it.setTag(R.id.view_tag_native_id, "granite:portal-initial-content:$revision:$key")
      if (attach) host.addView(it)
    }

  private fun begin() {
    ReactMarker.logFabricMarker(ReactMarkerConstants.FABRIC_BATCH_EXECUTION_START, null, ++commitNumber, 0L)
  }

  private fun end() {
    ReactMarker.logFabricMarker(ReactMarkerConstants.FABRIC_BATCH_EXECUTION_END, null, commitNumber, 0L)
  }

  private fun insertSentinel(marker: PortalInitialContentView) {
    val sentinel = View(controller.get()).apply {
      setTag(R.id.view_tag_native_id, PortalInitialContentView.SENTINEL_ID)
    }
    viewManager.addView(marker, sentinel, 0)
  }

  private fun complete(marker: PortalInitialContentView) {
    begin()
    if (marker.childCount == 0 || !marker.isMountSentinel(marker.getChildAt(0))) {
      insertSentinel(marker)
    } else {
      viewManager.addView(marker, View(controller.get()), marker.childCount)
    }
    end()
  }

  private fun drain() = shadowOf(Looper.getMainLooper()).idle()
}
