package run.granite.rncomponentview

import kotlin.math.ceil

/** Sizing rules of [RNComponentView]. They use no Android types, so they run on the JVM. */
internal object RNComponentViewLayout {
    /**
     * Size a content-sized view takes before the renderer measures the content, in dp. The Portal lays content out
     * only in a host whose width and height are both non-zero.
     */
    const val PLACEHOLDER_SIZE_DP = 48f

    /** The width the content asks for, in px, or `null` when the layout sets the width. */
    fun contentWidthPx(
        sizing: RNComponentViewSizing,
        isEmpty: Boolean,
        contentSize: RNComponentView.ContentSize?,
        density: Float,
    ): Int? = when (sizing) {
        RNComponentViewSizing.CONTENT_HEIGHT,
        RNComponentViewSizing.CONSTRAINED,
        -> null
        RNComponentViewSizing.CONTENT_SIZE ->
            if (isEmpty) 0 else toPx(contentSize?.width ?: PLACEHOLDER_SIZE_DP, density)
    }

    /** The height the content asks for, in px, or `null` when the layout sets the height. */
    fun contentHeightPx(
        sizing: RNComponentViewSizing,
        isEmpty: Boolean,
        contentSize: RNComponentView.ContentSize?,
        density: Float,
    ): Int? = when (sizing) {
        RNComponentViewSizing.CONTENT_HEIGHT,
        RNComponentViewSizing.CONTENT_SIZE,
        -> if (isEmpty) 0 else toPx(contentSize?.height ?: PLACEHOLDER_SIZE_DP, density)
        RNComponentViewSizing.CONSTRAINED -> null
    }

    /**
     * Whether the placeholder covers the view. Content replaces it once attached and, for content-sized views, once
     * the renderer has measured it. An empty view shows nothing.
     */
    fun showsPlaceholder(
        sizing: RNComponentViewSizing,
        isEmpty: Boolean,
        hasAttachedContent: Boolean,
        hasContentSize: Boolean,
    ): Boolean {
        if (isEmpty) {
            return false
        }
        val isContentReady =
            hasAttachedContent && (sizing == RNComponentViewSizing.CONSTRAINED || hasContentSize)
        return !isContentReady
    }

    /** Rounds up so the measured content is never clipped by a fraction of a pixel. */
    private fun toPx(dp: Float, density: Float): Int = ceil(dp * density).toInt()
}
