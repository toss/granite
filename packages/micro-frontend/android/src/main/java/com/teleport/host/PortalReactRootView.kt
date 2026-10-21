package com.teleport.host

import android.view.MotionEvent
import android.view.View
import com.facebook.react.ReactHost
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.ReactContext
import com.facebook.react.config.ReactFeatureFlags
import com.facebook.react.uimanager.JSPointerDispatcher
import com.facebook.react.uimanager.JSTouchDispatcher
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.events.EventDispatcher

/**
 * @property measuresPortalsInRootView When true, portals teleported from a detached controller
 *   surface into hosts under this root view are positioned relative to it, so their press regions
 *   stay on the host. The app then gives the controller surface this root view's viewport offset,
 *   or `measureInWindow()` of those portals misses the window offset.
 */
class PortalReactRootView @JvmOverloads constructor(
  context: ThemedReactContext,
  private val reactHost: ReactHost,
  surfaceId: Int,
  private val moduleName: String,
  val measuresPortalsInRootView: Boolean = false,
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
    touchDispatcher.onChildStartedNativeGesture(ev, dispatcher)
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
    touchDispatcher.handleTouchEvent(event, dispatcher, currentReactContext)
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
