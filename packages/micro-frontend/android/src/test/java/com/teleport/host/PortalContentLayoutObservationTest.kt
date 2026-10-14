package com.teleport.host

import android.app.Activity
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.R
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.views.text.ReactTextView
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import com.teleport.portal.PortalView
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mockStatic
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.Config
import java.time.Duration

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], manifest = Config.NONE)
class PortalContentLayoutObservationTest {
  private lateinit var controller: ActivityController<Activity>
  private lateinit var container: FrameLayout
  private lateinit var host: PortalHostView

  @Before
  fun setUp() {
    controller = Robolectric.buildActivity(Activity::class.java).setup().visible()
    container = FrameLayout(controller.get())
    controller.get().setContentView(container)
    host = PortalHostView(controller.get())
    container.addView(host)
    shadowOf(Looper.getMainLooper()).idle()
  }

  @After
  fun tearDown() {
    controller.pause().stop().destroy()
  }

  @Test
  fun `matching attached content releases once without blocking drawing`() {
    addMarker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(1, calls)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `late subscription schedules a traversal without another content mutation`() {
    // Legacy graphics mode otherwise marks shadow Windows hidden and suppresses traversals.
    val property = "robolectric.areWindowsMarkedVisible"
    val previousValue = System.setProperty(property, "true")
    try {
      controller.pause().stop().destroy()
      setUp()
      host.layoutParams = FrameLayout.LayoutParams(200, 300)
      val marker = addMarker()
      val looper = shadowOf(Looper.getMainLooper())
      looper.idleFor(Duration.ofMillis(100))
      assertEquals(View.VISIBLE, host.windowVisibility)
      assertEquals(200, host.width)
      assertEquals(100, marker.width)
      assertFalse(host.isLayoutRequested)
      assertFalse(marker.isLayoutRequested)
      var calls = 0
      host.observeContentLayout("request", 2) { calls++ }
      assertEquals(0, calls)
      looper.idleFor(Duration.ofMillis(100))
      assertEquals(1, calls)
      looper.idleFor(Duration.ofMillis(100))
      assertEquals(1, calls)
    } finally {
      if (previousValue == null) System.clearProperty(property) else System.setProperty(property, previousValue)
    }
  }

  @Test
  fun `standard React nativeID property supplies the observed marker`() {
    val marker = ReactViewGroup(controller.get())
    marker.addView(View(controller.get()).also { layout(it) })
    // The manager's recycling flag reads JNI even when no React runtime is started.
    mockStatic(ReactNativeFeatureFlags::class.java).use { flags ->
      flags.`when`<Boolean> { ReactNativeFeatureFlags.enableViewRecyclingForView() }.thenReturn(false)
      ReactViewManager().setNativeId(marker, "granite:portal-initial-content:2:request")
    }
    host.addView(marker)
    layout(host, 200, 300)
    layout(marker)
    layout(marker.getChildAt(0))
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `subscription before first attach survives initial layout`() {
    val unattached = PortalHostView(controller.get())
    val marker = marker()
    unattached.addView(marker)
    var calls = 0
    unattached.observeContentLayout("request", 2) { calls++ }
    assertFalse(unattached.viewTreeObserver.dispatchOnPreDraw())
    assertEquals(0, calls)
    container.addView(unattached)
    layout(unattached, 200, 300)
    layout(marker)
    assertFalse(unattached.viewTreeObserver.dispatchOnPreDraw())
    assertEquals(1, calls)
  }

  @Test
  fun `request and revision must match exactly`() {
    val marker = addMarker("other", 2)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    marker.setTag(R.id.view_tag_native_id, "granite:portal-initial-content:3:request")
    draw()
    assertEquals(0, calls)
    marker.setTag(R.id.view_tag_native_id, "granite:portal-initial-content:2:request")
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `zero bounds and requested layout wait without blocking drawing`() {
    val marker = addMarker()
    layout(marker, 0, 100)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(0, calls)
    layout(marker)
    marker.requestLayout()
    draw()
    assertEquals(0, calls)
    layout(marker)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `pending layout in the physical ancestor path prevents readiness`() {
    val parent = FrameLayout(controller.get())
    val marker = marker()
    host.addView(parent)
    parent.addView(marker)
    layout(host, 200, 300)
    layout(parent)
    layout(marker)
    parent.forceLayout()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(0, calls)
    layout(parent)
    layout(marker)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `duplicate matching markers wait until unambiguous`() {
    addMarker()
    val duplicate = addMarker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(0, calls)
    host.removeView(duplicate)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `close is idempotent and prevents a later callback`() {
    addMarker()
    var calls = 0
    val subscription = host.observeContentLayout("request", 2) { calls++ }
    subscription.close()
    subscription.close()
    draw()
    assertEquals(0, calls)
  }

  @Test
  fun `cleanup cancels immediately while host remains attached`() {
    addMarker()
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    host.cleanup()
    draw()
    assertEquals(0, calls)
  }

  @Test
  fun `name changes cancel but setting the same name preserves observation`() {
    host.setName("destination")
    addMarker()
    var cancelledCalls = 0
    host.observeContentLayout("request", 2) { cancelledCalls++ }
    host.setName("replacement")
    var currentCalls = 0
    host.observeContentLayout("request", 2) { currentCalls++ }
    host.setName("replacement")
    draw()
    assertEquals(0, cancelledCalls)
    assertEquals(1, currentCalls)
  }

  @Test
  fun `detach cancels stale observation before a replacement host appears`() {
    addMarker()
    var staleCalls = 0
    host.observeContentLayout("request", 2) { staleCalls++ }
    container.removeView(host)
    container.addView(host)
    draw()
    assertEquals(0, staleCalls)
    val replacement = PortalHostView(controller.get())
    container.addView(replacement)
    val replacementMarker = marker()
    replacement.addView(replacementMarker)
    layout(replacement, 200, 300)
    layout(replacementMarker)
    var currentCalls = 0
    replacement.observeContentLayout("request", 2) { currentCalls++ }
    assertFalse(replacement.viewTreeObserver.dispatchOnPreDraw())
    assertEquals(0, staleCalls)
    assertEquals(1, currentCalls)
  }

  @Test
  fun `host resize preserves pending observation until content is laid out`() {
    layout(host, 200, 300)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    layout(host, 0, 0)
    draw()
    assertEquals(0, calls)
    layout(host, 300, 400)
    val marker = marker()
    host.addView(marker)
    layout(marker)
    draw()
    assertEquals(1, calls)
    layout(host, 400, 500)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `same size React text update does not block settled React boundary`() {
    val marker = ReactViewGroup(controller.get())
    marker.setTag(R.id.view_tag_native_id, "granite:portal-initial-content:2:request")
    val content = ReactTextView(controller.get())
    content.text = "before"
    marker.addView(content)
    host.addView(marker)
    layout(host, 200, 300)
    layout(marker)
    layout(content)
    content.text = "after!"
    assertTrue(content.isLayoutRequested)
    assertFalse(marker.isLayoutRequested)
    assertFalse(host.isLayoutRequested)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(1, calls)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `logical portal children in another window cannot satisfy this host`() {
    val otherActivity = Robolectric.buildActivity(Activity::class.java).setup().visible()
    val destination = PortalHostView(otherActivity.get())
    otherActivity.get().setContentView(destination)
    destination.setName("other-window")
    val source = PortalView(controller.get())
    host.addView(source)
    val marker = marker()
    source.addView(marker)
    source.setHostName("other-window")
    layout(host, 200, 300)
    layout(source)
    layout(destination, 200, 300)
    layout(marker)
    assertSame(marker, source.getChildAt(0))
    assertSame(destination, marker.parent)
    assertNotEquals(host.windowToken, marker.windowToken)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(0, calls)
    var destinationCalls = 0
    destination.observeContentLayout("request", 2) { destinationCalls++ }
    assertFalse(destination.viewTreeObserver.dispatchOnPreDraw())
    assertEquals(1, destinationCalls)
    source.cleanup()
    otherActivity.pause().stop().destroy()
  }

  @Test
  fun `reparented native content can use preserved bounds without isLaidOut`() {
    val marker = ReactViewGroup(controller.get()).apply {
      setTag(R.id.view_tag_native_id, "granite:portal-initial-content:2:request")
      addView(View(controller.get()).also { layout(it) })
    }
    container.addView(marker)
    layout(marker)
    container.removeView(marker)
    host.addView(marker)
    layout(host, 200, 300)
    layout(marker.getChildAt(0))
    assertFalse(marker.isLaidOut)
    assertFalse(marker.isLayoutRequested)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `callback can subscribe again without retaining completed observation`() {
    addMarker()
    var firstCalls = 0
    var secondCalls = 0
    host.observeContentLayout("request", 2) {
      firstCalls++
      host.observeContentLayout("request", 2) { secondCalls++ }
    }
    draw()
    draw()
    assertEquals(1, firstCalls)
    assertEquals(1, secondCalls)
  }

  @Test
  fun `empty marker waits for physical native content without blocking drawing`() {
    val marker = marker(withContent = false)
    host.addView(marker)
    layout(host, 200, 300)
    layout(marker)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(0, calls)
    marker.addView(View(controller.get()), FrameLayout.LayoutParams(100, 100))
    layout(marker)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `hidden or transparent content and ancestry cannot release observation`() {
    val marker = addMarker()
    val content = marker.getChildAt(0)
    var calls = 0
    content.visibility = View.INVISIBLE
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(0, calls)
    content.visibility = View.VISIBLE
    content.alpha = 0f
    draw()
    assertEquals(0, calls)
    content.alpha = 1f
    marker.visibility = View.INVISIBLE
    draw()
    assertEquals(0, calls)
    marker.visibility = View.VISIBLE
    host.alpha = 0f
    draw()
    assertEquals(0, calls)
    host.alpha = 1f
    layout(marker)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `zero size content waits for positive bounds`() {
    val marker = addMarker()
    val content = marker.getChildAt(0)
    layout(content, 0, 0)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }
    draw()
    assertEquals(0, calls)
    layout(content)
    draw()
    assertEquals(1, calls)
  }

  @Test
  fun `invalid request identity is rejected`() {
    assertThrows(IllegalArgumentException::class.java) { host.observeContentLayout("", 0) {} }
    assertThrows(IllegalArgumentException::class.java) { host.observeContentLayout("request", -1) {} }
  }

  private fun marker(key: String = "request", revision: Int = 2, withContent: Boolean = true) =
    FrameLayout(controller.get()).apply {
      setTag(R.id.view_tag_native_id, "granite:portal-initial-content:$revision:$key")
      if (withContent) addView(View(context), FrameLayout.LayoutParams(100, 100))
    }

  private fun addMarker(key: String = "request", revision: Int = 2) = marker(key, revision).also {
    host.addView(it)
    layout(host, 200, 300)
    layout(it)
  }

  private fun draw() = assertFalse(host.viewTreeObserver.dispatchOnPreDraw())

  private fun layout(view: View, width: Int = 100, height: Int = 100) {
    view.measure(exact(width), exact(height))
    view.layout(0, 0, width, height)
  }

  private fun exact(size: Int) = View.MeasureSpec.makeMeasureSpec(size, View.MeasureSpec.EXACTLY)
}
