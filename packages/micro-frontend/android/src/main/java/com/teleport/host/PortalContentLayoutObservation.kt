package com.teleport.host

import android.os.Handler
import android.os.Looper
import com.facebook.react.R
import com.facebook.react.bridge.UiThreadUtil
import com.teleport.initialcontent.PortalInitialContentRegistry

internal class PortalContentLayoutObservation(
  host: PortalHostView,
  requestKey: String,
  revision: Int,
  onReady: () -> Unit,
) : AutoCloseable {
  private var host: PortalHostView? = host
  private var onReady: (() -> Unit)? = onReady
  private val nativeId = "granite:portal-initial-content:$revision:$requestKey"
  private val handler = Handler(Looper.getMainLooper())
  private var scheduled = false
  private val check = Runnable {
    scheduled = false
    checkCompletedMount()
  }
  private val changed: () -> Unit = { scheduleCheck() }

  init {
    PortalInitialContentRegistry.observers.add(changed)
  }

  fun attach() = scheduleCheck()

  private fun scheduleCheck() {
    if (host == null || scheduled) return
    scheduled = true
    // Deliver outside Fabric's listener iteration and re-check the live identity/attachment.
    handler.post(check)
  }

  private fun checkCompletedMount() {
    val currentHost = host ?: return
    val matches = PortalInitialContentRegistry.markers.filter {
      it.getTag(R.id.view_tag_native_id) == nativeId && PortalInitialContentRegistry.isInHost(it, currentHost)
    }
    val marker = matches.singleOrNull() ?: return
    if (!marker.hasCompletedMount()) return
    val callback = onReady
    close()
    callback?.invoke()
  }

  override fun close() {
    UiThreadUtil.assertOnUiThread()
    PortalInitialContentRegistry.observers.remove(changed)
    handler.removeCallbacks(check)
    scheduled = false
    onReady = null
    val previousHost = host
    host = null
    previousHost?.removeContentLayoutObservation(this)
  }
}
