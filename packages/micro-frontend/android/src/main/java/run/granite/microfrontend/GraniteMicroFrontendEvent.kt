package run.granite.microfrontend

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

sealed interface GraniteMicroFrontendEvent {
    fun toWritableMap(): WritableMap

    data class PreloadApp(
        val appName: String,
        val requestId: String? = null,
    ) : GraniteMicroFrontendEvent {
        override fun toWritableMap(): WritableMap = eventMap(
            name = "preloadApp",
            params = Arguments.createMap().apply {
                putString("appName", appName)
                requestId?.let { putString("requestId", it) }
            },
        )
    }

    data class OpenApp(
        val sessionId: String,
        val appName: String,
        val scheme: String,
    ) : GraniteMicroFrontendEvent {
        override fun toWritableMap(): WritableMap = eventMap(
            name = "openApp",
            params = Arguments.createMap().apply {
                putString("sessionId", sessionId)
                putString("appName", appName)
                putString("scheme", scheme)
            },
        )
    }

    data class CloseApp(
        val sessionId: String,
    ) : GraniteMicroFrontendEvent {
        override fun toWritableMap(): WritableMap = eventMap(
            name = "closeApp",
            params = Arguments.createMap().apply { putString("sessionId", sessionId) },
        )
    }

    data class SessionVisibilityChanged(
        val sessionId: String,
        val isVisible: Boolean,
    ) : GraniteMicroFrontendEvent {
        override fun toWritableMap(): WritableMap = eventMap(
            name = "sessionVisibilityChanged",
            params = Arguments.createMap().apply {
                putString("sessionId", sessionId)
                putBoolean("isVisible", isVisible)
            },
        )
    }
}

private fun eventMap(name: String, params: WritableMap): WritableMap =
    Arguments.createMap().apply {
        putString("name", name)
        putMap("params", params)
    }
