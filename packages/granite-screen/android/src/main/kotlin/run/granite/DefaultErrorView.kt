package run.granite

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * Default error view displayed when React Native bundle loading fails Shows the error message in a
 * scrollable view
 */
class DefaultErrorView(
    context: Context,
    error: Throwable,
) : FrameLayout(context) {
    init {
        // Set white background
        setBackgroundColor(Color.WHITE)

        // Create scroll view for long error messages
        val scrollView = ScrollView(context)

        // Create error text view
        val errorTextView =
            TextView(context).apply {
                text =
                    buildString {
                        appendLine("Failed to load React Native bundle")
                        appendLine()
                        appendLine("Error: ${error.message ?: error.javaClass.simpleName}")

                        // Add stack trace in debug builds
                        if (BuildConfig.DEBUG) {
                            appendLine()
                            appendLine("Stack trace:")
                            error.stackTraceToString().lines().take(10).forEach { line ->
                                appendLine(line)
                            }
                        }
                    }
                textSize = 14f
                setTextColor(Color.rgb(220, 38, 38)) // Red color
                setPadding(32, 32, 32, 32)
            }

        scrollView.addView(errorTextView)

        val params =
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT).apply {
                gravity = Gravity.CENTER
                setMargins(16, 16, 16, 16)
            }

        addView(scrollView, params)
    }
}
