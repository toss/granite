package run.granite.lottie.builtin

import android.animation.Animator
import android.content.Context
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import com.airbnb.lottie.LottieAnimationView
import com.airbnb.lottie.LottieCompositionFactory
import com.airbnb.lottie.LottieDrawable
import com.airbnb.lottie.LottieProperty
import com.airbnb.lottie.RenderMode
import com.airbnb.lottie.TextDelegate
import com.airbnb.lottie.model.KeyPath
import com.airbnb.lottie.value.LottieValueCallback
import run.granite.lottie.*
import java.util.WeakHashMap

/**
 * Built-in Lottie provider using Airbnb's lottie-android SDK.
 * This provider renders Lottie animations natively using the official SDK.
 */
class BuiltInLottieProvider : GraniteLottieProvider {
    private val listeners = WeakHashMap<View, GraniteLottieListener>()
    private val animationViews = WeakHashMap<View, LottieAnimationView>()

    override fun createAnimationView(context: Context): View {
        val container = FrameLayout(context)
        val lottieView = LottieAnimationView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        container.addView(lottieView)
        animationViews[container] = lottieView
        return container
    }

    override fun loadAnimation(assetName: String, view: View, config: GraniteLottieLoadConfig) {
        val lottieView = animationViews[view] ?: return

        // Cancel any existing animation
        lottieView.cancelAnimation()

        // Set up animator listener
        setupAnimatorListener(lottieView, view)

        // Try loading from assets folder
        val assetPath = if (assetName.endsWith(".json")) assetName else "$assetName.json"
        lottieView.setAnimation(assetPath)

        applyConfig(config, lottieView)
        notifyLoaded(view)

        if (config.autoPlay) {
            lottieView.playAnimation()
        }
    }

    override fun loadAnimationFromJson(json: String, view: View, config: GraniteLottieLoadConfig) {
        val lottieView = animationViews[view] ?: return

        // Cancel any existing animation
        lottieView.cancelAnimation()

        // Set up animator listener
        setupAnimatorListener(lottieView, view)

        val compositionTask = LottieCompositionFactory.fromJsonString(json, null)
        compositionTask.addListener { composition ->
            lottieView.setComposition(composition)
            applyConfig(config, lottieView)
            notifyLoaded(view)

            if (config.autoPlay) {
                lottieView.playAnimation()
            }
        }
        compositionTask.addFailureListener { e ->
            notifyFailure(view, e.message ?: "Failed to parse JSON")
        }
    }

    override fun loadAnimationFromUrl(url: String, view: View, config: GraniteLottieLoadConfig) {
        val lottieView = animationViews[view] ?: return

        // Cancel any existing animation
        lottieView.cancelAnimation()

        // Set up animator listener
        setupAnimatorListener(lottieView, view)

        val cacheKey = if (config.cacheComposition) url else null
        val compositionTask = LottieCompositionFactory.fromUrl(view.context, url, cacheKey)
        compositionTask.addListener { composition ->
            lottieView.setComposition(composition)
            applyConfig(config, lottieView)
            notifyLoaded(view)

            if (config.autoPlay) {
                lottieView.playAnimation()
            }
        }
        compositionTask.addFailureListener { e ->
            notifyFailure(view, e.message ?: "Failed to load from URL: $url")
        }
    }

    override fun loadDotLottie(uri: String, view: View, config: GraniteLottieLoadConfig) {
        val lottieView = animationViews[view] ?: return

        // Cancel any existing animation
        lottieView.cancelAnimation()

        // Set up animator listener
        setupAnimatorListener(lottieView, view)

        // .lottie files are zip archives, lottie-android 6.0+ supports them
        val cacheKey = if (config.cacheComposition) uri else null
        val compositionTask = LottieCompositionFactory.fromUrl(view.context, uri, cacheKey)
        compositionTask.addListener { composition ->
            lottieView.setComposition(composition)
            applyConfig(config, lottieView)
            notifyLoaded(view)

            if (config.autoPlay) {
                lottieView.playAnimation()
            }
        }
        compositionTask.addFailureListener { e ->
            notifyFailure(view, e.message ?: "Failed to load .lottie: $uri")
        }
    }

    override fun setListener(listener: GraniteLottieListener?, view: View) {
        if (listener != null) {
            listeners[view] = listener
        } else {
            listeners.remove(view)
        }
    }

    override fun play(view: View, startFrame: Int, endFrame: Int) {
        val lottieView = animationViews[view] ?: return

        if (startFrame >= 0 && endFrame > startFrame) {
            lottieView.setMinAndMaxFrame(startFrame, endFrame)
            lottieView.playAnimation()
        } else {
            // Play from beginning when no specific frames are provided
            lottieView.progress = 0f
            lottieView.playAnimation()
        }
    }

    override fun pause(view: View) {
        animationViews[view]?.pauseAnimation()
    }

    override fun resume(view: View) {
        animationViews[view]?.resumeAnimation()
    }

    override fun reset(view: View) {
        val lottieView = animationViews[view] ?: return
        lottieView.cancelAnimation()
        lottieView.progress = 0f
    }

    override fun setProgress(progress: Float, view: View) {
        animationViews[view]?.progress = progress
    }

    override fun setSpeed(speed: Float, view: View) {
        animationViews[view]?.speed = speed
    }

    override fun setLoop(loop: Boolean, view: View) {
        animationViews[view]?.repeatCount = if (loop) LottieDrawable.INFINITE else 0
    }

    override fun applyColorFilters(filters: List<GraniteLottieColorFilter>, view: View) {
        val lottieView = animationViews[view] ?: return

        for (filter in filters) {
            val keyPath = if (filter.keypath == "*") {
                KeyPath("**")
            } else {
                KeyPath(filter.keypath)
            }

            lottieView.addValueCallback(keyPath, LottieProperty.COLOR, LottieValueCallback(filter.color))
        }
    }

    override fun applyTextFilters(filters: List<GraniteLottieTextFilter>, view: View) {
        val lottieView = animationViews[view] ?: return

        val textDelegate = TextDelegate(lottieView)
        for (filter in filters) {
            textDelegate.setText(filter.find, filter.replace)
        }
        lottieView.setTextDelegate(textDelegate)
    }

    override fun cancelLoad(view: View) {
        animationViews[view]?.cancelAnimation()
    }

    override fun disposeView(view: View) {
        animationViews[view]?.cancelAnimation()
        animationViews[view]?.removeAllAnimatorListeners()
        animationViews.remove(view)
        listeners.remove(view)
    }

    // Private helpers

    private fun setupAnimatorListener(lottieView: LottieAnimationView, view: View) {
        lottieView.removeAllAnimatorListeners()
        lottieView.addAnimatorListener(object : Animator.AnimatorListener {
            override fun onAnimationStart(animation: Animator) {}

            override fun onAnimationEnd(animation: Animator) {
                // Only notify finish when not looping
                // In loop mode, onAnimationRepeat is called instead
                if (lottieView.repeatCount != LottieDrawable.INFINITE) {
                    listeners[view]?.onAnimationFinish(false)
                }
            }

            override fun onAnimationCancel(animation: Animator) {
                listeners[view]?.onAnimationFinish(true)
            }

            override fun onAnimationRepeat(animation: Animator) {
                listeners[view]?.onAnimationLoop()
            }
        })
    }

    private fun applyConfig(config: GraniteLottieLoadConfig, lottieView: LottieAnimationView) {
        lottieView.speed = config.speed
        lottieView.repeatCount = if (config.loop) LottieDrawable.INFINITE else 0
        lottieView.progress = config.progress

        // Resize mode
        lottieView.scaleType = when (config.resizeMode) {
            GraniteLottieResizeMode.COVER -> ImageView.ScaleType.CENTER_CROP
            GraniteLottieResizeMode.CENTER -> ImageView.ScaleType.CENTER
            else -> ImageView.ScaleType.FIT_CENTER
        }

        // Render mode
        lottieView.renderMode = when (config.renderMode) {
            GraniteLottieRenderMode.HARDWARE -> RenderMode.HARDWARE
            GraniteLottieRenderMode.SOFTWARE -> RenderMode.SOFTWARE
            else -> RenderMode.AUTOMATIC
        }

        // Safe mode
        if (config.enableSafeMode) {
            lottieView.setSafeMode(true)
        }

        // Merge paths
        if (config.enableMergePaths) {
            lottieView.enableMergePathsForKitKatAndAbove(true)
        }

        // Image assets folder
        config.imageAssetsFolder?.let {
            lottieView.imageAssetsFolder = it
        }
    }

    private fun notifyLoaded(view: View) {
        listeners[view]?.onAnimationLoaded()
    }

    private fun notifyFailure(view: View, error: String) {
        listeners[view]?.onAnimationFailure(error)
    }
}