package com.teleport.host

import android.os.Handler
import android.os.Looper
import android.view.ViewTreeObserver
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
  private var preDrawObserver: ViewTreeObserver? = null
  private var dirty = false
  private val check = Runnable {
    scheduled = false
    checkCompletedMount()
  }
  private val preDrawListener = ViewTreeObserver.OnPreDrawListener {
    if (dirty) {
      dirty = false
      checkCompletedMount()
    }
    true
  }
  private val changed: () -> Unit = {
    dirty = true
    scheduleCheck()
  }

  init {
    PortalInitialContentRegistry.observers.add(changed)
  }

  fun attach() {
    dirty = true
    installPreDrawListener()
    scheduleCheck()
  }

  private fun installPreDrawListener() {
    val currentHost = host ?: return
    if (!currentHost.isAttachedToWindow) return
    val currentObserver = currentHost.viewTreeObserver
    if (preDrawObserver === currentObserver) return
    removePreDrawListener()
    currentObserver.addOnPreDrawListener(preDrawListener)
    preDrawObserver = currentObserver
  }

  private fun removePreDrawListener() {
    preDrawObserver?.takeIf { it.isAlive }?.removeOnPreDrawListener(preDrawListener)
    preDrawObserver = null
  }

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
    removePreDrawListener()
    onReady = null
    val previousHost = host
    host = null
    previousHost?.removeContentLayoutObservation(this)
  }
}
