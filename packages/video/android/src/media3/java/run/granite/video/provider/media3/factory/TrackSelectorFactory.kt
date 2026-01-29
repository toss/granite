package run.granite.video.provider.media3.factory

import android.content.Context
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector

/**
 * Factory interface for creating TrackSelector instances.
 * Abstracted to allow for testability.
 */
interface TrackSelectorFactory {
    /**
     * Create a DefaultTrackSelector instance.
     * @param context The Android context.
     * @return A new DefaultTrackSelector instance.
     */
    fun create(context: Context): DefaultTrackSelector
}

/**
 * Default implementation that creates a standard DefaultTrackSelector.
 */
class DefaultTrackSelectorFactory : TrackSelectorFactory {
    override fun create(context: Context): DefaultTrackSelector {
        return DefaultTrackSelector(context)
    }
}
