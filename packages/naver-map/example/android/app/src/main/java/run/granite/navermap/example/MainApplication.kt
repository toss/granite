package run.granite.navermap.example

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.shell.MainReactPackage
import run.granite.navermap.GraniteNaverMapPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = getPackages(),
    )
  }

  private fun getPackages(): List<ReactPackage> = listOf(
    MainReactPackage(),
    GraniteNaverMapPackage(),
  )

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
