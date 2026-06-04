package %%androidPackage%%

import android.content.Context
import android.util.Log
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

object GreenfieldBundleLoader {
  private const val TAG = "GreenfieldBundleLoader"
  private const val BUNDLE_ASSET_NAME = "index.android.bundle"
  private const val BUNDLE_FILE_NAME = "index.android.bundle"
  private const val METRO_TIMEOUT_MS = 1_500

  // Replace this with the CDN bundle URL returned by `granite forge`.
  private const val REMOTE_BUNDLE_URL = ""

  fun resolveBundleFilePath(context: Context): String? {
    val cachedBundle = bundleFile(context)
    if (cachedBundle.exists()) {
      return cachedBundle.absolutePath
    }

    if (assetExists(context, BUNDLE_ASSET_NAME)) {
      return "assets://$BUNDLE_ASSET_NAME"
    }

    val remoteBundleURL = REMOTE_BUNDLE_URL.trim()
    if (remoteBundleURL.isEmpty()) {
      return null
    }

    downloadBundle(remoteBundleURL, cachedBundle)?.let {
      return it.absolutePath
    }

    return null
  }

  private fun bundleFile(context: Context): File =
    File(File(context.cacheDir, "granite-bundles"), BUNDLE_FILE_NAME)

  private fun assetExists(context: Context, assetName: String): Boolean =
    runCatching {
      context.assets.open(assetName).use { true }
    }.getOrDefault(false)

  private fun downloadBundle(sourceURL: String, destination: File): File? =
    runCatching {
      destination.parentFile?.mkdirs()
      val connection = (URL(sourceURL).openConnection() as HttpURLConnection).apply {
        connectTimeout = METRO_TIMEOUT_MS
        readTimeout = METRO_TIMEOUT_MS
      }
      connection.inputStream.use { input ->
        destination.outputStream().use { output ->
          input.copyTo(output)
        }
      }
      destination
    }.onFailure { error ->
      Log.d(TAG, "Bundle unavailable from $sourceURL: ${error.message}")
    }.getOrNull()
}
