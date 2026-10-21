package run.granite.rncomponentview.example

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.interfaces.fabric.ReactSurface

class MainApplication : Application(), ReactApplication {

  private lateinit var rendererSurface: ReactSurface

  /** The surface that renders the components of every RNComponentView. It has id 0 until it starts. */
  val rendererSurfaceId: Int
    get() = rendererSurface.surfaceID

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)

    // Keeps the renderer running for the lifetime of the process. The surface is not attached to any view: its
    // RNComponentViewRenderer draws each component into the Portal host of an RNComponentView. Starting it also
    // starts the React instance and evaluates the bundle.
    rendererSurface = reactHost.createSurface(applicationContext, RENDERER_MODULE_NAME, null)
    rendererSurface.start()
  }

  companion object {
    const val RENDERER_MODULE_NAME = "RendererHost"
  }
}
