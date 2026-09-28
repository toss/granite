---
'@granite-js/video': patch
---

Keep the Android video player alive across window detach. `GraniteVideoView.onDetachedFromWindow` released the provider, but a detached view can be attached to a window again — for example when a navigator returns to a screen whose views it had removed — and the provider is only created in `init`. The reattached view was left without a provider, so the video area stayed black and no playback command reached the player. The view now releases only from `GraniteVideoViewManager.onDropViewInstance`, which React Native calls when it actually drops the view.
