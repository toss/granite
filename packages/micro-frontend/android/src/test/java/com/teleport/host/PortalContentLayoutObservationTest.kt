@file:OptIn(com.facebook.react.common.annotations.UnstableReactNativeAPI::class)

package com.teleport.host

import android.app.Activity
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.R
import com.facebook.react.bridge.UIManager
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
  private lateinit var manager: UIManager
  private val markers = mutableListOf<PortalInitialContentView>()

  @Before
  fun setUp() {
    controller = Robolectric.buildActivity(Activity::class.java).setup().visible()
    container = FrameLayout(controller.get())
    controller.get().setContentView(container)
    host = PortalHostView(controller.get())
    container.addView(host)
    manager = mock(UIManager::class.java)
    drain()
  }

  @After
  fun tearDown() {
    host.cleanup()
    markers.forEach { it.dispose() }
    controller.pause().stop().destroy()
    drain()
    assertTrue(PortalInitialContentRegistry.observers.isEmpty())
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
    marker.didDispatchMountItems(manager)
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
    complete(marker)
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
    marker.willMountItems(manager)
    drain()
    assertEquals(0, calls)
    marker.didMountItems(manager)
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
  fun `completion listener is bound to its UI manager and released on disposal`() {
    val marker = marker()
    marker.bind(manager)
    verify(manager).addUIManagerEventListener(marker)
    marker.dispose()
    verify(manager).removeUIManagerEventListener(marker)
    assertFalse(marker.hasCompletedMount())
    assertFalse(PortalInitialContentRegistry.markers.contains(marker))
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

  private fun complete(marker: PortalInitialContentView) {
    marker.willMountItems(manager)
    marker.didMountItems(manager)
  }

  private fun drain() = shadowOf(Looper.getMainLooper()).idle()
}
