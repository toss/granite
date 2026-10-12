package com.teleport.host

import android.app.Activity
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.R
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.Config
import org.robolectric.RobolectricTestRunner

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
    val marker = View(controller.get())
    marker.setTag(R.id.view_tag_native_id, "granite:portal-initial-content:2:request")
    host.addView(marker)
    host.measure(exact(200), exact(300))
    host.layout(0, 0, 200, 300)
    marker.measure(exact(100), exact(100))
    marker.layout(0, 0, 100, 100)
    var calls = 0
    host.observeContentLayout("request", 2) { calls++ }

    assertFalse(host.viewTreeObserver.dispatchOnPreDraw())
    assertEquals(1, calls)
    assertFalse(host.viewTreeObserver.dispatchOnPreDraw())
    assertEquals(1, calls)
  }

  private fun exact(size: Int) = View.MeasureSpec.makeMeasureSpec(size, View.MeasureSpec.EXACTLY)
}
