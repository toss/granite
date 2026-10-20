package com.teleport.portal

import android.graphics.Point
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.RootViewUtil
import com.facebook.react.uimanager.StateWrapper
import com.teleport.extensions.dp
import com.teleport.extensions.isDetached
import com.teleport.extensions.screenLocation
import com.teleport.host.PortalHostView

internal class PortalLayoutStateController(
  private val sourceView: View,
) {
  private var lastLayout = PortalLayoutState.EMPTY
  private var stateWrapper: StateWrapper? = null

  fun setStateWrapper(wrapper: StateWrapper?) {
    stateWrapper = wrapper
  }

  fun updateIfNeeded(
    hostName: String?,
    host: PortalHostView?,
  ) {
    val wrapper = stateWrapper
    val activeHost = activeHost(hostName, host)

    when {
      wrapper == null -> Unit
      activeHost == null -> resetIfNeeded()
      else -> publishIfChanged(wrapper, createLayoutState(activeHost))
    }
  }

  fun resetIfNeeded() {
    val wrapper = stateWrapper

    if (wrapper != null) {
      publishIfChanged(wrapper, PortalLayoutState.EMPTY)
    }
  }

  private fun activeHost(
    hostName: String?,
    host: PortalHostView?,
  ): PortalHostView? =
    if (hostName == null || host == null || host.isDetached()) {
      null
    } else {
      host
    }

  private fun publishIfChanged(
    wrapper: StateWrapper,
    nextLayout: PortalLayoutState,
  ) {
    if (lastLayout != nextLayout) {
      lastLayout = nextLayout
      wrapper.updateState(nextLayout.toMap())
    }
  }

  private fun createLayoutState(host: PortalHostView): PortalLayoutState {
    // This offset becomes the PortalView transform, which `measure` includes and Pressability compares
    // with touches in root-view coordinates, so it is the host's position in its React root view.
    // The window offset belongs to the controller surface's viewport offset, which `measure` excludes.
    val offset =
      if (sourceView.isDetached()) {
        host.offsetInRootView()
      } else {
        val hostLocation = host.screenLocation()
        val sourceLocation = sourceView.screenLocation()
        Point(hostLocation[0] - sourceLocation[0], hostLocation[1] - sourceLocation[1])
      }

    return PortalLayoutState(
      hostWidth = host.width.toFloat().dp,
      hostHeight = host.height.toFloat().dp,
      offsetX = offset.x.toFloat().dp,
      offsetY = offset.y.toFloat().dp,
    )
  }

  private fun View.offsetInRootView(): Point {
    val root = RootViewUtil.getRootView(this) as? View ?: return Point(0, 0)
    val location = IntArray(2).also { getLocationInWindow(it) }
    val rootLocation = IntArray(2).also { root.getLocationInWindow(it) }
    return Point(location[0] - rootLocation[0], location[1] - rootLocation[1])
  }
}

private data class PortalLayoutState(
  val hostWidth: Double,
  val hostHeight: Double,
  val offsetX: Double,
  val offsetY: Double,
) {
  fun toMap() =
    Arguments.createMap().apply {
      putDouble("hostWidth", hostWidth)
      putDouble("hostHeight", hostHeight)
      putDouble("offsetX", offsetX)
      putDouble("offsetY", offsetY)
    }

  companion object {
    val EMPTY =
      PortalLayoutState(
        hostWidth = 0.0,
        hostHeight = 0.0,
        offsetX = 0.0,
        offsetY = 0.0,
      )
  }
}
