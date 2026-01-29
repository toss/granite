package run.granite

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView

/**
 * Default loading view displayed while React Native bundle is loading Shows a progress indicator
 * and loading message
 */
class DefaultLoadingView(
    context: Context,
) : FrameLayout(context) {
    init {
        // Set white background
        setBackgroundColor(Color.WHITE)

        // Create and add progress indicator
        val progressBar = ProgressBar(context).apply { isIndeterminate = true }

        val progressParams =
            LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.CENTER
            }

        addView(progressBar, progressParams)

        // Create and add loading text
        val loadingText =
            TextView(context).apply {
                text = "Loading..."
                textSize = 16f
                setTextColor(Color.GRAY)
            }

        val textParams =
            LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.CENTER
                topMargin = 120 // Place below progress bar
            }

        addView(loadingText, textParams)
    }
}
