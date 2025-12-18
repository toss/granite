package com.anthropic.reactnativegranitevideo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.anthropic.reactnativegranitevideo.provider.GraniteVideoRegistry

class GraniteVideoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun clearCache(promise: Promise) {
        try {
            GraniteVideoRegistry.createProvider()?.clearCache()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CLEAR_CACHE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getWidevineLevel(promise: Promise) {
        try {
            val level = GraniteVideoRegistry.createProvider()?.getWidevineLevel() ?: 0
            promise.resolve(level)
        } catch (e: Exception) {
            promise.reject("WIDEVINE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isCodecSupported(mimeType: String, width: Int, height: Int, promise: Promise) {
        try {
            val supported = GraniteVideoRegistry.createProvider()?.isCodecSupported(mimeType, width, height) ?: false
            promise.resolve(supported)
        } catch (e: Exception) {
            promise.reject("CODEC_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isHEVCSupported(promise: Promise) {
        try {
            val supported = GraniteVideoRegistry.createProvider()?.isHEVCSupported() ?: false
            promise.resolve(supported)
        } catch (e: Exception) {
            promise.reject("HEVC_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCurrentPosition(viewTag: Int, promise: Promise) {
        // This would need to find the view by tag and get the current position
        // For now, return 0
        promise.resolve(0.0)
    }

    @ReactMethod
    fun save(viewTag: Int, options: ReadableMap?, promise: Promise) {
        // Save functionality - would need implementation
        promise.reject("NOT_IMPLEMENTED", "Save is not implemented on Android")
    }

    companion object {
        const val NAME = "GraniteVideoModule"
    }
}
