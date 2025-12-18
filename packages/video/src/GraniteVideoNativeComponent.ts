import type { ViewProps, HostComponent } from 'react-native';
import {
  type Int32,
  type Float,
  type Double,
  type DirectEventHandler,
  type WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

// ============================================================
// Native Props Interface
// ============================================================

interface NativeVideoSource {
  uri?: string;
  type?: string;
  startPosition?: Double;
  cropStart?: Double;
  cropEnd?: Double;
}

interface NativeBufferConfig {
  minBufferMs?: Int32;
  maxBufferMs?: Int32;
  bufferForPlaybackMs?: Int32;
  bufferForPlaybackAfterRebufferMs?: Int32;
  backBufferDurationMs?: Int32;
  cacheSizeMB?: Int32;
}

interface NativeSelectedTrack {
  type?: string;
  value?: string;
}

interface NativeSelectedVideoTrack {
  type?: string;
  value?: Int32;
}

interface NativeDrmConfig {
  type?: string;
  licenseServer?: string;
  contentId?: string;
  certificateUrl?: string;
  base64Certificate?: boolean;
}

export interface NativeProps extends ViewProps {
  // Source
  source?: NativeVideoSource;

  // Poster
  poster?: string;
  posterResizeMode?: WithDefault<string, 'contain'>;

  // Playback Control
  paused?: boolean;
  muted?: boolean;
  volume?: Float;
  rate?: Float;
  repeat?: boolean;
  playInBackground?: boolean;
  playWhenInactive?: boolean;
  automaticallyWaitsToMinimizeStalling?: boolean;
  shutterColor?: string;

  // Display
  resizeMode?: WithDefault<string, 'contain'>;
  viewType?: WithDefault<string, 'surface'>;
  useTextureView?: boolean;
  useSecureView?: boolean;

  // Buffering
  bufferConfig?: NativeBufferConfig;
  minLoadRetryCount?: Int32;
  maxBitRate?: Int32;
  preferredForwardBufferDuration?: Double;

  // Track Selection
  selectedAudioTrack?: NativeSelectedTrack;
  selectedTextTrack?: NativeSelectedTrack;
  selectedVideoTrack?: NativeSelectedVideoTrack;

  // DRM
  drm?: NativeDrmConfig;
  localSourceEncryptionKeyScheme?: string;

  // Ads
  adTagUrl?: string;
  adLanguage?: string;

  // Controls
  controls?: boolean;
  showNotificationControls?: boolean;
  disableFocus?: boolean;
  disableDisconnectError?: boolean;
  focusable?: boolean;
  hideShutterView?: boolean;
  preventsDisplaySleepDuringVideoPlayback?: boolean;

  // Fullscreen
  fullscreen?: boolean;
  fullscreenAutorotate?: boolean;
  fullscreenOrientation?: WithDefault<string, 'all'>;

  // Picture in Picture
  pictureInPicture?: boolean;

  // Content
  contentStartTime?: Double;
  allowsExternalPlayback?: boolean;
  audioOutput?: WithDefault<string, 'speaker'>;
  ignoreSilentSwitch?: WithDefault<string, 'inherit'>;
  mixWithOthers?: WithDefault<string, 'inherit'>;

  // Debug
  enableDebug?: boolean;
  enableDebugThread?: boolean;

  // === Events ===
  onVideoLoadStart?: DirectEventHandler<{
    isNetwork: boolean;
    type: string;
    uri: string;
  }>;
  onVideoLoad?: DirectEventHandler<{
    currentTime: Double;
    duration: Double;
    naturalSize: {
      width: Double;
      height: Double;
      orientation: string;
    };
  }>;
  onVideoError?: DirectEventHandler<{
    error: {
      code: Int32;
      domain: string;
      localizedDescription: string;
      localizedFailureReason: string;
      localizedRecoverySuggestion: string;
      errorString: string;
    };
  }>;
  onVideoProgress?: DirectEventHandler<{
    currentTime: Double;
    playableDuration: Double;
    seekableDuration: Double;
  }>;
  onVideoSeek?: DirectEventHandler<{
    currentTime: Double;
    seekTime: Double;
  }>;
  onVideoEnd?: DirectEventHandler<null>;
  onVideoBuffer?: DirectEventHandler<{
    isBuffering: boolean;
  }>;
  onVideoBandwidthUpdate?: DirectEventHandler<{
    bitrate: Double;
    width: Int32;
    height: Int32;
  }>;
  onVideoPlaybackStateChanged?: DirectEventHandler<{
    isPlaying: boolean;
    isSeeking: boolean;
    isLooping: boolean;
  }>;
  onVideoPlaybackRateChange?: DirectEventHandler<{
    playbackRate: Float;
  }>;
  onVideoVolumeChange?: DirectEventHandler<{
    volume: Float;
  }>;
  onVideoIdle?: DirectEventHandler<null>;
  onVideoReadyForDisplay?: DirectEventHandler<null>;
  onVideoAudioFocusChanged?: DirectEventHandler<{
    hasAudioFocus: boolean;
  }>;
  onVideoAudioBecomingNoisy?: DirectEventHandler<null>;
  onVideoFullscreenPlayerWillPresent?: DirectEventHandler<null>;
  onVideoFullscreenPlayerDidPresent?: DirectEventHandler<null>;
  onVideoFullscreenPlayerWillDismiss?: DirectEventHandler<null>;
  onVideoFullscreenPlayerDidDismiss?: DirectEventHandler<null>;
  onVideoPictureInPictureStatusChanged?: DirectEventHandler<{
    isActive: boolean;
  }>;
  onVideoRestoreUserInterfaceForPictureInPictureStop?: DirectEventHandler<null>;
  onVideoControlsVisibilityChange?: DirectEventHandler<{
    isVisible: boolean;
  }>;
  onVideoExternalPlaybackChange?: DirectEventHandler<{
    isExternalPlaybackActive: boolean;
  }>;
  onVideoAspectRatio?: DirectEventHandler<{
    width: Double;
    height: Double;
  }>;
}

// ============================================================
// Native Commands Interface
// ============================================================

export interface NativeCommands {
  seek: (viewRef: React.ElementRef<HostComponent<NativeProps>>, time: Double, tolerance: Double) => void;
  adjustVolume: (viewRef: React.ElementRef<HostComponent<NativeProps>>, volume: Float) => void;
  setFullScreen: (viewRef: React.ElementRef<HostComponent<NativeProps>>, fullscreen: boolean) => void;
  loadSource: (viewRef: React.ElementRef<HostComponent<NativeProps>>, uri: string) => void;
  pause: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  resume: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  enterPictureInPicture: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  exitPictureInPicture: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'seek',
    'adjustVolume',
    'setFullScreen',
    'loadSource',
    'pause',
    'resume',
    'enterPictureInPicture',
    'exitPictureInPicture',
  ],
});

export default codegenNativeComponent<NativeProps>('GraniteVideoView');
