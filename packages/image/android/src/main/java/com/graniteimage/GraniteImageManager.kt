package com.graniteimage

import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.EventDispatcher
import com.facebook.react.viewmanagers.GraniteImageManagerDelegate
import com.facebook.react.viewmanagers.GraniteImageManagerInterface

/**
 * ViewManager for the GraniteImage Fabric Component.
 * This class bridges React Native's view system with our native GraniteImage.
 */
@ReactModule(name = GraniteImageManager.NAME)
class GraniteImageManager : SimpleViewManager<GraniteImage>(), GraniteImageManagerInterface<GraniteImage> {
    companion object {
        const val NAME = "GraniteImage"
        private const val TAG = "GraniteImageManager"
    }

    private val delegate: ViewManagerDelegate<GraniteImage> = GraniteImageManagerDelegate(this)

    override fun getName(): String = NAME

    override fun getDelegate(): ViewManagerDelegate<GraniteImage> = delegate

    override fun createViewInstance(reactContext: ThemedReactContext): GraniteImage {
        Log.d(TAG, "createViewInstance called")
        return GraniteImage(reactContext)
    }

    @ReactProp(name = "uri")
    override fun setUri(view: GraniteImage, uri: String?) {
        Log.d(TAG, "setUri: $uri")
        view.setUri(uri)
    }

    @ReactProp(name = "headers")
    override fun setHeaders(view: GraniteImage, headers: String?) {
        Log.d(TAG, "setHeaders: $headers")
        view.setHeaders(headers)
    }

    @ReactProp(name = "contentMode")
    override fun setContentMode(view: GraniteImage, contentMode: String?) {
        Log.d(TAG, "setContentMode: $contentMode")
        view.setContentMode(contentMode)
    }

    @ReactProp(name = "priority")
    override fun setPriority(view: GraniteImage, priority: String?) {
        Log.d(TAG, "setPriority: $priority")
        view.setPriority(priority)
    }

    @ReactProp(name = "cachePolicy")
    override fun setCachePolicy(view: GraniteImage, cachePolicy: String?) {
        Log.d(TAG, "setCachePolicy: $cachePolicy")
        view.setCachePolicy(cachePolicy)
    }

    @ReactProp(name = "tintColor", customType = "Color")
    override fun setTintColor(view: GraniteImage, tintColor: Int?) {
        Log.d(TAG, "setTintColor: $tintColor")
        view.setTintColor(tintColor)
    }

    @ReactProp(name = "defaultSource")
    override fun setDefaultSource(view: GraniteImage, defaultSource: String?) {
        Log.d(TAG, "setDefaultSource: $defaultSource")
        view.setDefaultSource(defaultSource)
    }

    @ReactProp(name = "fallbackSource")
    override fun setFallbackSource(view: GraniteImage, fallbackSource: String?) {
        Log.d(TAG, "setFallbackSource: $fallbackSource")
        view.setFallbackSource(fallbackSource)
    }

    override fun onDropViewInstance(view: GraniteImage) {
        Log.d(TAG, "onDropViewInstance called")
        view.cleanup()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put("onGraniteLoadStart", MapBuilder.of("registrationName", "onGraniteLoadStart"))
            .put("onGraniteProgress", MapBuilder.of("registrationName", "onGraniteProgress"))
            .put("onGraniteLoad", MapBuilder.of("registrationName", "onGraniteLoad"))
            .put("onGraniteError", MapBuilder.of("registrationName", "onGraniteError"))
            .put("onGraniteLoadEnd", MapBuilder.of("registrationName", "onGraniteLoadEnd"))
            .build()
    }
}
