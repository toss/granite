package com.graniteimage

/**
 * Singleton registry for managing the current GraniteImageProvider.
 * Applications should register their provider implementation at app startup.
 */
object GraniteImageRegistry {
    /**
     * The currently registered image provider.
     * If null, GraniteImage will display an error state.
     */
    var provider: GraniteImageProvider? = null
        private set

    /**
     * Registers an image provider to be used by all GraniteImage instances.
     * @param provider The provider implementation to register
     */
    fun registerProvider(provider: GraniteImageProvider) {
        this.provider = provider
    }

    /**
     * Clears the currently registered provider.
     */
    fun clearProvider() {
        this.provider = null
    }
}
