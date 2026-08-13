package com.teleport.global

import android.view.View
import com.facebook.react.bridge.UiThreadUtil
import com.teleport.host.PortalHostView
import com.teleport.portal.PortalView
import java.lang.ref.WeakReference

/**
 * Matches source [PortalView] instances with destination [PortalHostView] instances by name.
 *
 * The registry is confined to the Android UI thread because it stores and invokes [View]
 * instances. Callers must not access it from background threads.
 */
object PortalRegistry {
  private val hosts: MutableMap<String, MutableList<WeakReference<PortalHostView>>> = HashMap()
  private val pendingPortals: MutableMap<String, MutableList<WeakReference<PortalView>>> = HashMap()

  fun registerHost(
    name: String,
    view: PortalHostView,
  ) {
    UiThreadUtil.assertOnUiThread()
    val namedHosts = hosts.getOrPut(name) { mutableListOf() }
    namedHosts.removeAll { it.get() == null || it.get() === view }
    namedHosts.add(WeakReference(view))
    notifySubscribers(name)
  }

  fun unregisterHost(
    name: String,
    view: PortalHostView,
  ) {
    UiThreadUtil.assertOnUiThread()
    hosts[name]?.let { namedHosts ->
      namedHosts.removeAll { it.get() == null || it.get() === view }
      if (namedHosts.isEmpty()) {
        hosts.remove(name)
      }
    }
    notifySubscribers(name)
  }

  private fun notifySubscribers(name: String) {
    pendingPortals[name]?.let { portals ->
      val iterator = portals.iterator()
      while (iterator.hasNext()) {
        val portalRef = iterator.next()
        portalRef.get()?.onHostChanged() ?: iterator.remove()
      }
    }
  }

  fun notifyHostLayoutChanged(name: String) {
    UiThreadUtil.assertOnUiThread()
    pendingPortals[name]?.let { portals ->
      val iterator = portals.iterator()
      while (iterator.hasNext()) {
        val portalRef = iterator.next()
        portalRef.get()?.onHostLayoutChanged() ?: iterator.remove()
      }
    }
  }

  /**
   * Prefer an attached destination in the source View's Window. If the source
   * belongs to a detached controller surface, or no same-window destination
   * exists, use the most recently registered attached host from another Window.
   */
  fun resolveHost(
    name: String?,
    sourceView: View,
  ): PortalHostView? {
    UiThreadUtil.assertOnUiThread()
    if (name == null) return null

    val namedHosts = hosts[name] ?: return null
    namedHosts.removeAll { it.get() == null }
    if (namedHosts.isEmpty()) {
      hosts.remove(name)
      return null
    }

    val liveHosts = namedHosts.mapNotNull { it.get() }
    val sourceWindowToken = sourceView.windowToken
    if (sourceView.isAttachedToWindow && sourceWindowToken != null) {
      liveHosts.lastOrNull {
        it.isAttachedToWindow && it.windowToken == sourceWindowToken
      }?.let { return it }
    }

    return liveHosts.lastOrNull { it.isAttachedToWindow }
  }

  fun registerPendingPortal(
    hostName: String,
    portal: PortalView,
  ) {
    UiThreadUtil.assertOnUiThread()
    val portals = pendingPortals.getOrPut(hostName) { mutableListOf() }
    portals.removeAll { it.get() == null || it.get() == portal }
    portals.add(WeakReference(portal))
  }

  fun unregisterPendingPortal(
    hostName: String,
    portal: PortalView,
  ) {
    UiThreadUtil.assertOnUiThread()
    pendingPortals[hostName]?.let { portals ->
      portals.removeAll { it.get() == null || it.get() == portal }
      if (portals.isEmpty()) {
        pendingPortals.remove(hostName)
      }
    }
  }
}
