package run.granite.microfrontend

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class GraniteMicroFrontendRuntimePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == NativeGraniteMicroFrontendRuntimeSpec.NAME) {
            GraniteMicroFrontendRuntimeModule(reactContext)
        } else {
            null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        mapOf(
            NativeGraniteMicroFrontendRuntimeSpec.NAME to ReactModuleInfo(
                name = NativeGraniteMicroFrontendRuntimeSpec.NAME,
                className = GraniteMicroFrontendRuntimeModule::class.java.name,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = true,
            ),
        )
    }
}
