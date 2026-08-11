package teleport.example

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

  private lateinit var teleportControllerSurface: ReactSurface

  val teleportControllerSurfaceId: Int
    get() = teleportControllerSurface.surfaceID

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

    // Keep one detached React tree alive for the lifetime of the process. Starting
    // this surface also initializes the shared ReactHost and evaluates the bundle.
    // Its native children can later be re-parented into an ActivityPortalHost.
    teleportControllerSurface =
        reactHost.createSurface(applicationContext, "TeleportController", null)
    teleportControllerSurface.start()
  }
}
