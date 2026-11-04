package run.granite.rncomponentview.example

import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import kotlin.math.roundToInt
import run.granite.rncomponentview.RNComponentRendererListener
import run.granite.rncomponentview.RNComponentSessions
import run.granite.rncomponentview.RNComponentView
import run.granite.rncomponentview.RNComponentViewSizing

/** A native screen that shows the React Native component `ComponentViewDemo` in an RNComponentView per sizing. */
class MainActivity : AppCompatActivity() {
  private val reactHost: ReactHost
    get() = checkNotNull((application as ReactApplication).reactHost)

  private val rendererListener = RNComponentRendererListener { isAttached ->
    if (isAttached) {
      activateComponentViews()
    }
  }

  private lateinit var contentHeightComponentView: RNComponentView
  private lateinit var componentViews: List<Pair<Int, RNComponentView>>
  private var componentItemCount = 1
  private var isContentHeightComponentNarrow = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val content =
        LinearLayout(this).apply {
          orientation = LinearLayout.VERTICAL
          setBackgroundColor(getColor(R.color.example_background))
          setPadding(dp(24), dp(32), dp(24), dp(32))
        }
    addComponentViewDemo(content)
    setContentView(
        ScrollView(this).apply {
          isFillViewport = true
          addView(content)
        },
    )

    RNComponentSessions.addRendererListener(rendererListener)
    if (RNComponentSessions.isRendererAttached) {
      activateComponentViews()
    }
  }

  override fun onResume() {
    super.onResume()
    reactHost.onHostResume(this)
  }

  override fun onPause() {
    reactHost.onHostPause(this)
    super.onPause()
  }

  override fun onDestroy() {
    RNComponentSessions.removeRendererListener(rendererListener)
    reactHost.onHostDestroy(this)
    super.onDestroy()
  }

  /**
   * The renderer runs inside the surface that MainApplication starts. Once the renderer is attached, that surface has
   * started and has the id the views send touches to; the React instance can be running before that.
   */
  private fun activateComponentViews() {
    val rendererSurfaceId = (application as MainApplication).rendererSurfaceId
    componentViews.forEach { (_, componentView) ->
      componentView.activate(reactHost, rendererSurfaceId, MainApplication.RENDERER_MODULE_NAME)
    }
  }

  private fun addComponentViewDemo(content: LinearLayout) {
    content.addView(
        TextView(this).apply {
          setText(R.string.component_view_title)
          setTextColor(getColor(R.color.example_label))
          textSize = 22f
          setTypeface(typeface, Typeface.BOLD)
        },
        matchWidthLayoutParams(),
    )
    content.addView(
        TextView(this).apply {
          setText(R.string.component_view_description)
          setTextColor(getColor(R.color.example_secondary_label))
          textSize = 15f
        },
        matchWidthLayoutParams().apply { topMargin = dp(8) },
    )

    contentHeightComponentView =
        componentView(R.string.component_view_content_height, RNComponentViewSizing.CONTENT_HEIGHT)
    addLabeledComponentView(
        content,
        R.string.component_view_content_height,
        contentHeightComponentView,
        // Keeps the view at the start edge when Toggle width narrows it.
        matchWidthLayoutParams().apply { gravity = Gravity.START },
    )

    val contentSizeComponentView =
        componentView(R.string.component_view_content_size, RNComponentViewSizing.CONTENT_SIZE)
    addLabeledComponentView(
        content,
        R.string.component_view_content_size,
        contentSizeComponentView,
        LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ),
    )

    val constrainedComponentView =
        componentView(R.string.component_view_constrained, RNComponentViewSizing.CONSTRAINED)
    addLabeledComponentView(
        content,
        R.string.component_view_constrained,
        constrainedComponentView,
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(200)),
    )

    componentViews =
        listOf(
            R.string.component_view_content_height to contentHeightComponentView,
            R.string.component_view_content_size to contentSizeComponentView,
            R.string.component_view_constrained to constrainedComponentView,
        )

    val controls = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    controls.addView(
        demoButton(R.string.component_view_add_item) { updateComponentItemCount(componentItemCount + 1) },
    )
    controls.addView(
        demoButton(R.string.component_view_remove_item) {
          updateComponentItemCount(maxOf(0, componentItemCount - 1))
        },
    )
    controls.addView(demoButton(R.string.component_view_toggle_width) { toggleContentHeightComponentWidth() })
    content.addView(controls, matchWidthLayoutParams().apply { topMargin = dp(16) })
  }

  private fun componentView(titleResource: Int, sizing: RNComponentViewSizing) =
      RNComponentView(
          context = this,
          componentName = COMPONENT_NAME,
          props = componentProps(titleResource, sizing),
          sizing = sizing,
      )

  private fun componentProps(titleResource: Int, sizing: RNComponentViewSizing): Map<String, Any?> =
      mapOf(
          "title" to getString(titleResource),
          "itemCount" to componentItemCount,
          "fillsView" to (sizing == RNComponentViewSizing.CONSTRAINED),
      )

  private fun addLabeledComponentView(
      content: LinearLayout,
      labelResource: Int,
      componentView: RNComponentView,
      layoutParams: LinearLayout.LayoutParams,
  ) {
    content.addView(
        TextView(this).apply {
          setText(labelResource)
          setTextColor(getColor(R.color.example_secondary_label))
          textSize = 14f
        },
        matchWidthLayoutParams().apply {
          topMargin = dp(20)
          bottomMargin = dp(6)
        },
    )
    content.addView(componentView, layoutParams)
  }

  private fun updateComponentItemCount(itemCount: Int) {
    componentItemCount = itemCount
    componentViews.forEach { (titleResource, componentView) ->
      componentView.updateProps(componentProps(titleResource, componentView.sizing))
    }
  }

  private fun toggleContentHeightComponentWidth() {
    isContentHeightComponentNarrow = !isContentHeightComponentNarrow
    contentHeightComponentView.layoutParams =
        (contentHeightComponentView.layoutParams as LinearLayout.LayoutParams).apply {
          width = if (isContentHeightComponentNarrow) dp(220) else LinearLayout.LayoutParams.MATCH_PARENT
        }
  }

  private fun demoButton(titleResource: Int, onClick: () -> Unit) =
      Button(this).apply {
        setText(titleResource)
        isAllCaps = false
        setOnClickListener { onClick() }
      }

  private fun matchWidthLayoutParams() =
      LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
      )

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).roundToInt()

  private companion object {
    const val COMPONENT_NAME = "ComponentViewDemo"
  }
}
