package run.granite.video.provider.factory

import android.content.Context
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector

/**
 * Factory interface for creating ExoPlayer instances.
 * Abstracted to allow for testability.
 */
interface ExoPlayerFactory {
    /**
     * Create an ExoPlayer instance.
     * @param context The Android context.
     * @param trackSelector The track selector to use.
     * @return A new ExoPlayer instance.
     */
    fun create(context: Context, trackSelector: DefaultTrackSelector): ExoPlayer
}

/**
 * Default implementation that creates a standard ExoPlayer.
 */
@UnstableApi
class DefaultExoPlayerFactory : ExoPlayerFactory {
    override fun create(context: Context, trackSelector: DefaultTrackSelector): ExoPlayer {
        return ExoPlayer.Builder(context)
            .setTrackSelector(trackSelector)
            .build()
    }
}
