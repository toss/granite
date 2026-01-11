package run.granite.video.provider.factory

import android.content.Context
import android.view.SurfaceView
import android.view.TextureView
import android.view.View
import android.widget.FrameLayout

/**
 * Factory interface for creating video surface views.
 * Abstracted to allow for testability.
 */
interface VideoSurfaceFactory {
    /**
     * Create a SurfaceView for video rendering.
     * @param context The Android context.
     * @return A new SurfaceView.
     */
    fun createSurfaceView(context: Context): SurfaceView

    /**
     * Create a TextureView for video rendering.
     * @param context The Android context.
     * @return A new TextureView.
     */
    fun createTextureView(context: Context): TextureView

    /**
     * Create a container FrameLayout for the video player.
     * @param context The Android context.
     * @return A new FrameLayout.
     */
    fun createContainer(context: Context): FrameLayout
}

/**
 * Default implementation that creates standard Android views.
 */
class DefaultVideoSurfaceFactory : VideoSurfaceFactory {

    override fun createSurfaceView(context: Context): SurfaceView {
        return SurfaceView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
    }

    override fun createTextureView(context: Context): TextureView {
        return TextureView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
    }

    override fun createContainer(context: Context): FrameLayout {
        return FrameLayout(context)
    }
}
