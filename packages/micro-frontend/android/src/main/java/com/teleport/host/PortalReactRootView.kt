package com.teleport.host

import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import com.facebook.react.ReactHost
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.ReactContext
import com.facebook.react.config.ReactFeatureFlags
import com.facebook.react.uimanager.JSPointerDispatcher
import com.facebook.react.uimanager.JSTouchDispatcher
import com.facebook.react.uimanager.RootViewUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.events.EventDispatcher

/**
 * Detached Fabric root that forwards touch and pointer events of the surface [surfaceId] through
 * [reactHost]. It does not start another runtime or surface. Touches carry their position in the
 * viewport, where `measure()` reports the teleported content they land on.
 */
class PortalReactRootView(
  context: ThemedReactContext,
  private val reactHost: ReactHost,
  surfaceId: Int,
  private val moduleName: String,
) : ReactRootView(context) {
  private val touchDispatcher = JSTouchDispatcher(this)
  private val pointerDispatcher =
      if (ReactFeatureFlags.dispatchPointerEvents) {
        JSPointerDispatcher(this)
      } else {
        null
      }

  private val eventDispatcher: EventDispatcher?
    get() =
        reactHost.currentReactContext?.let {
          UIManagerHelper.getEventDispatcher(it, UIManagerType.FABRIC)
        }

  init {
    setIsFabric(true)
    setRootViewTag(surfaceId)
  }

  override fun onMeasure(
    widthMeasureSpec: Int,
    heightMeasureSpec: Int,
  ) {
    super.onMeasure(widthMeasureSpec, heightMeasureSpec)

    val childWidthSpec = MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY)
    val childHeightSpec = MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
    for (index in 0 until childCount) {
      getChildAt(index).measure(childWidthSpec, childHeightSpec)
    }
  }

  override fun onLayout(
    changed: Boolean,
    left: Int,
    top: Int,
    right: Int,
    bottom: Int,
  ) {
    for (index in 0 until childCount) {
      getChildAt(index).layout(0, 0, right - left, bottom - top)
    }
  }

  override fun onChildStartedNativeGesture(
    childView: View?,
    ev: MotionEvent,
  ) {
    val dispatcher = eventDispatcher ?: return
    touchDispatcher.onChildStartedNativeGesture(ev, pageSpaceTouches(dispatcher))
    childView?.let {
      pointerDispatcher?.onChildStartedNativeGesture(it, ev, dispatcher)
    }
  }

  override fun onChildEndedNativeGesture(
    childView: View,
    ev: MotionEvent,
  ) {
    val dispatcher = eventDispatcher ?: return
    touchDispatcher.onChildEndedNativeGesture(ev, dispatcher)
    pointerDispatcher?.onChildEndedNativeGesture()
  }

  override fun handleException(t: Throwable) {
    val exception = if (t is Exception) t else RuntimeException(t)
    currentReactContext?.handleException(exception) ?: throw exception
  }

  override fun getUIManagerType(): Int = UIManagerType.FABRIC

  override fun getJSModuleName(): String = moduleName

  override fun dispatchJSTouchEvent(event: MotionEvent) {
    val dispatcher = eventDispatcher ?: return
    if (event.actionMasked == MotionEvent.ACTION_DOWN) {
      // Pressability measures the pressed view when a gesture starts. A host that moved with an
      // ancestor or a scroll since it was last laid out has content that `measure()` still reports
      // where it was, so bring it up to date before JS sees the touch.
      notifyHostLayoutsChanged(this)
    }
    touchDispatcher.handleTouchEvent(event, pageSpaceTouches(dispatcher), currentReactContext)
  }

  /** Stops at each host: the views inside it are teleported content, not this root's own. */
  private fun notifyHostLayoutsChanged(parent: ViewGroup) {
    for (index in 0 until parent.childCount) {
      when (val child = parent.getChildAt(index)) {
        is PortalHostView -> child.notifyLayoutChanged()
        is ViewGroup -> notifyHostLayoutsChanged(child)
      }
    }
  }

  /**
   * `measure()` reports teleported content at its host's position in the viewport: the Portal
   * transform puts it there, relative to a controller surface that runs detached or fills its window
   * (see `PortalLayoutStateController`). Touches have to be reported in the same place, because
   * Pressability cancels a press once a moving touch leaves the region `measure()` reported. A root
   * away from the viewport origin, like one embedded in part of a screen, would otherwise report
   * them off by its own position.
   */
  private fun pageSpaceTouches(dispatcher: EventDispatcher): EventDispatcher {
    val pageOffset = RootViewUtil.getViewportOffset(this)
    return PageSpaceTouchEventDispatcher(dispatcher, pageOffset.x.toFloat(), pageOffset.y.toFloat())
  }

  override fun dispatchJSPointerEvent(
    event: MotionEvent,
    isCapture: Boolean,
  ) {
    val dispatcher = eventDispatcher ?: return
    pointerDispatcher?.handleMotionEvent(event, dispatcher, isCapture)
  }

  override fun hasActiveReactContext(): Boolean =
      currentReactContext?.hasActiveReactInstance() == true

  override fun hasActiveReactInstance(): Boolean = hasActiveReactContext()

  override fun getCurrentReactContext(): ReactContext? = reactHost.currentReactContext

  override fun isViewAttachedToReactInstance(): Boolean = hasActiveReactContext()
}
