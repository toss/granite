package %%androidPackage%%

import com.brickmodule.BrickModuleRegistrar
import com.brickmodule.BrickModuleRegistry
import com.brickmodule.BrickModulesList
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity(), BrickModuleRegistrar {
  private val moduleRegistry = BrickModuleRegistry()
  private var didRegisterBrickModules = false

  override fun getMainComponentName(): String = "shared"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onResume() {
    super.onResume()
    registerBrickModulesIfAvailable()
  }

  override fun getModuleRegistry(): BrickModuleRegistry {
    registerBrickModulesIfAvailable()
    return moduleRegistry
  }

  private fun registerBrickModulesIfAvailable() {
    if (didRegisterBrickModules) {
      return
    }

    val reactContext = reactHost.currentReactContext ?: return
    moduleRegistry.register(BrickModulesList(reactContext).modules)
    didRegisterBrickModules = true
  }
}
