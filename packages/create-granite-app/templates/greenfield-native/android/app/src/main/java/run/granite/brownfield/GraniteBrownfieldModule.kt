package run.granite.brownfield

import com.facebook.react.bridge.ReactContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GraniteBrownfieldModule(
  private val reactContext: ReactContext
) : GraniteBrownfieldModuleSpec {
  override val moduleName: String = GraniteBrownfieldModuleSpec.MODULE_NAME

  override fun getSchemeUri(): String = reactContext.currentActivity?.intent?.dataString.orEmpty()

  override suspend fun closeView() {
    withContext(Dispatchers.Main) {
      reactContext.currentActivity?.finish()
    }
  }

  override fun emitEvent(eventName: String, payload: Map<String, Any>) = Unit
}
