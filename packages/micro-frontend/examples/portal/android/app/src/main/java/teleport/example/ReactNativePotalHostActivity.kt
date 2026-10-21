package teleport.example

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.react.uimanager.ThemedReactContext
import com.teleport.host.PortalHostView
import com.teleport.host.PortalReactRootView
import run.granite.microfrontend.ActivitySessionBinding

class ReactNativePotalHostActivity :
    AppCompatActivity(),
    DefaultHardwareBackBtnHandler {
  private val portalHostName: String
    get() =
        requireNotNull(intent.data?.host) {
          "ReactNativePotalHostActivity requires the portal host name as the URI host"
        }

  private val reactBackPressedCallback =
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          isEnabled = false
          if (reactHost.onBackPressed()) {
            isEnabled = true
          } else {
            onBackPressedDispatcher.onBackPressed()
          }
        }
      }

  private val reactHost: ReactHost
    get() = checkNotNull((application as ReactApplication).reactHost)

  private val reactInstanceEventListener =
      object : ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext) {
          attachPortal(context)
        }
      }

  private var portalHostView: PortalHostView? = null
  private var portalRootView: PortalReactRootView? = null
  private var isHostResumed = false
  private lateinit var sessionBinding: ActivitySessionBinding

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    sessionBinding =
        ActivitySessionBinding.bind(
            activity = this,
            sessionId = portalHostName,
            appName = portalHostName,
            scheme = requireNotNull(intent.data).toString(),
        )
    onBackPressedDispatcher.addCallback(this, reactBackPressedCallback)
    setContentView(
        FrameLayout(this).apply {
          setBackgroundColor(Color.BLACK)
        },
    )

    reactHost.addReactInstanceEventListener(reactInstanceEventListener)
    reactHost.currentReactContext?.let(::attachPortal)
  }

  override fun onResume() {
    super.onResume()
    reactHost.onHostResume(this, this)
    isHostResumed = true
    syncControllerSurfaceViewport()
  }

  override fun onPause() {
    isHostResumed = false
    reactHost.onHostPause(this)
    super.onPause()
  }

  override fun onDestroy() {
    reactHost.removeReactInstanceEventListener(reactInstanceEventListener)
    portalHostView?.setName(null)
    reactHost.onHostDestroy(this)
    super.onDestroy()
  }

  override fun invokeDefaultOnBackPressed() {
    reactBackPressedCallback.isEnabled = false
    onBackPressedDispatcher.onBackPressed()
  }

  private fun attachPortal(context: ReactContext) {
    if (portalHostView != null || !context.hasActiveReactInstance()) {
      return
    }

    val controllerSurfaceId =
        (application as MainApplication).teleportControllerSurfaceId
    val reactApplicationContext =
        checkNotNull(context as? ReactApplicationContext)
    val themedReactContext =
        ThemedReactContext(
            reactApplicationContext,
            this,
            CONTROLLER_MODULE_NAME,
            controllerSurfaceId,
        )
    val activityRootView =
        PortalReactRootView(
            themedReactContext,
            reactHost,
            controllerSurfaceId,
            CONTROLLER_MODULE_NAME,
            measuresPortalsInRootView = true,
        )
    val hostView =
        PortalHostView(themedReactContext).apply {
          id = View.generateViewId()
          setBackgroundColor(Color.BLACK)
          setName(portalHostName)
        }

    portalHostView = hostView
    activityRootView.addView(
        hostView,
        FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
        ),
    )
    setContentView(activityRootView)

    portalRootView = activityRootView
    activityRootView.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
      syncControllerSurfaceViewport()
    }
    ViewCompat.setOnApplyWindowInsetsListener(activityRootView) { view, insets ->
      // The viewport offset follows the window's visible top, which can change without a new layout.
      view.post(::syncControllerSurfaceViewport)
      ViewCompat.onApplyWindowInsets(view, insets)
    }
  }

  // Every host Activity shares the one controller surface, so only the resumed one sets its offset.
  private fun syncControllerSurfaceViewport() {
    val rootView = portalRootView ?: return
    if (!isHostResumed || !rootView.measuresPortalsInRootView) {
      return
    }
    ControllerSurfaceViewport.update(
        (application as MainApplication).teleportControllerSurface,
        rootView,
    )
  }

  private companion object {
    const val CONTROLLER_MODULE_NAME = "TeleportController"
  }
}
