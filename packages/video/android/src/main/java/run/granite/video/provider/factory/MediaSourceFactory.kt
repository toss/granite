package run.granite.video.provider.factory

import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.exoplayer.dash.DashMediaSource
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.smoothstreaming.SsMediaSource
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import run.granite.video.provider.GraniteVideoSource

/**
 * Factory interface for creating MediaSource instances.
 * Abstracted to allow for testability.
 */
interface MediaSourceFactory {
    /**
     * Create a MediaSource for the given video source.
     * @param source The video source configuration.
     * @param dataSourceFactory The data source factory to use.
     * @return A new MediaSource.
     */
    fun create(source: GraniteVideoSource, dataSourceFactory: DataSource.Factory): MediaSource
}

/**
 * Default implementation that creates appropriate MediaSource based on content type.
 */
@UnstableApi
class DefaultMediaSourceFactory : MediaSourceFactory {

    override fun create(source: GraniteVideoSource, dataSourceFactory: DataSource.Factory): MediaSource {
        val uri = Uri.parse(source.uri ?: "")
        val type = source.type ?: inferType(uri)

        val mediaItem = MediaItem.fromUri(uri)

        return when (type.lowercase()) {
            "hls", "m3u8" -> HlsMediaSource.Factory(dataSourceFactory)
                .createMediaSource(mediaItem)
            "dash", "mpd" -> DashMediaSource.Factory(dataSourceFactory)
                .createMediaSource(mediaItem)
            "ss", "ism", "smoothstreaming" -> SsMediaSource.Factory(dataSourceFactory)
                .createMediaSource(mediaItem)
            else -> ProgressiveMediaSource.Factory(dataSourceFactory)
                .createMediaSource(mediaItem)
        }
    }

    private fun inferType(uri: Uri): String {
        val path = uri.path?.lowercase() ?: ""
        return when {
            path.endsWith(".m3u8") -> "hls"
            path.endsWith(".mpd") -> "dash"
            path.contains(".ism") -> "ss"
            else -> "progressive"
        }
    }
}
