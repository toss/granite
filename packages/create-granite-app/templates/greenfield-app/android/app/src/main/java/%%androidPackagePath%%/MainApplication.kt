package %%androidPackage%%

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages() =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here.
        }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override fun getJSBundleFile(): String? {
        if (BuildConfig.DEBUG) {
          return null
        }
        return GreenfieldBundleLoader.resolveBundleFilePath(applicationContext)
      }
    }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      reactNativeHost = reactNativeHost,
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
