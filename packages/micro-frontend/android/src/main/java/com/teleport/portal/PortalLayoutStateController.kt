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
    // This offset is what `PortalViewShadowNode.getTransform` translates by, and that transform is
    // what `measureInWindow` reports. Neither what these nodes render nor what they receive touches
    // on depends on it: the children are physically parented by the host, and `TouchTargetHelper`
    // walks the real View tree. So it decides only where they say they are.
    //
    // A detached controller surface cannot measure itself: `getLocationOnScreen` returns (0, 0) for
    // a view with no window, so an offset derived from it lands the teleported subtree in a
    // different space than an ordinary, window-attached surface. React Native puts a surface root
    // into that space with `RootViewUtil.getViewportOffset`; asking it about the host, which is the
    // view these children are actually parented by, puts them there too. Delegating rather than
    // repeating the arithmetic also means the two stay together when React Native changes what
    // `getViewportOffset` does — 0.86 rewrote it around `WindowInsetsCompat`, for one.
    val offset =
      if (sourceView.isDetached()) {
        RootViewUtil.getViewportOffset(host)
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
