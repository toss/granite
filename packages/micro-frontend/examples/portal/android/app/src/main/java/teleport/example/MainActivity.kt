package teleport.example

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.ReactContext
import kotlin.math.roundToInt

class MainActivity : AppCompatActivity() {
  private val reactHost: ReactHost
    get() = checkNotNull((application as ReactApplication).reactHost)

  private val reactInstanceEventListener =
      object : ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext) {
          setControllerReady(context.hasActiveReactInstance())
        }
      }

  private lateinit var preparingText: TextView
  private lateinit var storeButton: Button
  private lateinit var walletButton: Button

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val content =
        LinearLayout(this).apply {
          gravity = Gravity.CENTER
          orientation = LinearLayout.VERTICAL
          setBackgroundColor(Color.rgb(245, 246, 248))
          setPadding(dp(24), dp(32), dp(24), dp(32))
        }

    content.addView(
        TextView(this).apply {
          setText(R.string.launcher_title)
          setTextColor(Color.BLACK)
          textSize = 28f
          setTypeface(typeface, android.graphics.Typeface.BOLD)
          gravity = Gravity.CENTER
        },
        LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ),
    )

    content.addView(
        TextView(this).apply {
          setText(R.string.launcher_description)
          setTextColor(Color.DKGRAY)
          textSize = 16f
          gravity = Gravity.CENTER
        },
        LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            )
            .apply {
              topMargin = dp(12)
              bottomMargin = dp(28)
            },
    )

    storeButton =
        Button(this).apply {
          setText(R.string.open_store_activity)
          isAllCaps = false
          isEnabled = false
          setOnClickListener {
            openReactNativeActivity(getString(R.string.store_portal_host_name))
          }
        }
    content.addView(storeButton, buttonLayoutParams())

    walletButton =
        Button(this).apply {
          setText(R.string.open_wallet_activity)
          isAllCaps = false
          isEnabled = false
          setOnClickListener {
            openReactNativeActivity(getString(R.string.wallet_portal_host_name))
          }
        }
    content.addView(walletButton, buttonLayoutParams())

    preparingText =
        TextView(this).apply {
          setText(R.string.launcher_preparing)
          setTextColor(Color.DKGRAY)
          textSize = 14f
          gravity = Gravity.CENTER
        }
    content.addView(
        preparingText,
        LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            )
            .apply { topMargin = dp(12) },
    )

    setContentView(content)
    reactHost.addReactInstanceEventListener(reactInstanceEventListener)
    setControllerReady(reactHost.currentReactContext?.hasActiveReactInstance() == true)
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
    reactHost.removeReactInstanceEventListener(reactInstanceEventListener)
    reactHost.onHostDestroy(this)
    super.onDestroy()
  }

  private fun openReactNativeActivity(portalHostName: String) {
    startActivity(
        Intent(this, ReactNativePotalHostActivity::class.java)
            .setData(
                Uri.Builder()
                    .scheme("teleport-portal")
                    .authority(portalHostName)
                    .build(),
            ),
    )
  }

  private fun setControllerReady(isReady: Boolean) {
    storeButton.isEnabled = isReady
    walletButton.isEnabled = isReady
    preparingText.visibility = if (isReady) View.GONE else View.VISIBLE
  }

  private fun buttonLayoutParams() =
      LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              LinearLayout.LayoutParams.WRAP_CONTENT,
          )
          .apply {
            topMargin = dp(6)
            bottomMargin = dp(6)
          }

  private fun dp(value: Int): Int =
      (value * resources.displayMetrics.density).roundToInt()

}
