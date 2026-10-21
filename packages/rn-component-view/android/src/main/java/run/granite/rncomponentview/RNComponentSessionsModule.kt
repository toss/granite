package run.granite.rncomponentview

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeGraniteRNComponentSessionsSpec.NAME)
internal class RNComponentSessionsModule(
    reactContext: ReactApplicationContext,
) : NativeGraniteRNComponentSessionsSpec(reactContext),
    RNComponentEventSink {
    override fun invalidate() {
        RNComponentSessions.detach(this)
        super.invalidate()
    }

    override fun startEventDelivery() {
        RNComponentSessions.startEventDelivery(this)
    }

    override fun reportContentSize(request: ReadableMap) {
        val sessionId = request.getString("sessionId") ?: return
        RNComponentSessions.reportContentSize(
            sessionId,
            request.getDouble("width").toFloat(),
            request.getDouble("height").toFloat(),
            this,
        )
    }

    override fun enqueueEvent(event: RNComponentEvent): Boolean =
        reactApplicationContext.runOnJSQueueThread {
            emitOnEvent(event.toWritableMap())
        }
}
