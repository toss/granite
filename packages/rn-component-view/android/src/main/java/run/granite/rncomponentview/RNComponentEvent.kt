package run.granite.rncomponentview

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

/** How the renderer sizes a component relative to its [RNComponentView]. */
enum class RNComponentViewSizing(internal val wireName: String) {
    /** The host view sets the width and the content sets the height. */
    CONTENT_HEIGHT("contentHeight"),

    /** The content sets both the width and the height. */
    CONTENT_SIZE("contentSize"),

    /** The host view sets both the width and the height, and the content fills it. */
    CONSTRAINED("constrained"),
}

/** An event for the JavaScript component renderer, sent through `onEvent`. */
internal sealed interface RNComponentEvent {
    val name: String

    fun toWritableMap(): WritableMap

    data class OpenComponent(
        val sessionId: String,
        val componentName: String,
        val props: Map<String, Any?>,
        val sizing: RNComponentViewSizing,
        val bundleFilePath: String?,
    ) : RNComponentEvent {
        override val name: String
            get() = "openComponent"

        override fun toWritableMap(): WritableMap = eventMap(
            name = name,
            params = Arguments.createMap().apply {
                putString("sessionId", sessionId)
                putString("componentName", componentName)
                putMap("props", Arguments.makeNativeMap(props))
                putString("sizing", sizing.wireName)
                bundleFilePath?.let { putString("bundleFilePath", it) }
            },
        )
    }

    data class UpdateComponentProps(
        val sessionId: String,
        val props: Map<String, Any?>,
    ) : RNComponentEvent {
        override val name: String
            get() = "updateComponentProps"

        override fun toWritableMap(): WritableMap = eventMap(
            name = name,
            params = Arguments.createMap().apply {
                putString("sessionId", sessionId)
                putMap("props", Arguments.makeNativeMap(props))
            },
        )
    }

    data class CloseComponent(
        val sessionId: String,
    ) : RNComponentEvent {
        override val name: String
            get() = "closeComponent"

        override fun toWritableMap(): WritableMap = eventMap(
            name = name,
            params = Arguments.createMap().apply { putString("sessionId", sessionId) },
        )
    }
}

private fun eventMap(name: String, params: WritableMap): WritableMap =
    Arguments.createMap().apply {
        putString("name", name)
        putMap("params", params)
    }
