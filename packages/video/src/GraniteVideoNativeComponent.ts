import { type ViewProps, type HostComponent, codegenNativeCommands, codegenNativeComponent } from 'react-native';
import {
  type Int32,
  type Float,
  type Double,
  type DirectEventHandler,
  type WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

// ============================================================
// Native Props Interface
// ============================================================

// Native video metadata
interface NativeVideoMetadata {
  title?: string;
  subtitle?: string;
  description?: string;
  artist?: string;
  imageUri?: string;
}

interface NativeStringMapEntry {
  name: string;
  value: string;
}

// Native DRM config (source-embedded DRM)
interface NativeSourceDrmConfig {
  type?: string;
  licenseServer?: string;
  headers?: ReadonlyArray<Readonly<NativeStringMapEntry>>;
  contentId?: string;
  certificateUrl?: string;
  base64Certificate?: boolean;
  multiDrm?: boolean;
  localSourceEncryptionKeyScheme?: string; // iOS-Only offline DRM key scheme
}

// Native CMCD config
interface NativeCmcdConfiguration {
  mode?: Int32;
  request?: ReadonlyArray<Readonly<NativeStringMapEntry>>;
  session?: ReadonlyArray<Readonly<NativeStringMapEntry>>;
  object?: ReadonlyArray<Readonly<NativeStringMapEntry>>;
  status?: ReadonlyArray<Readonly<NativeStringMapEntry>>;
}

// Native text track
interface NativeTextTrack {
  title: string;
  language: string;
  type: string;
  uri: string;
}

// Native ad config
interface NativeAdsConfig {
  type?: string;
  streamType?: string;
  adTagUrl?: string;
  adLanguage?: string;
  contentSourceId?: string;
  videoId?: string;
  assetKey?: string;
  format?: string;
  adTagParameters?: ReadonlyArray<Readonly<NativeStringMapEntry>>;
  fallbackUri?: string;
}

// Native live buffer config
interface NativeBufferConfigLive {
  maxPlaybackSpeed?: Float;
  minPlaybackSpeed?: Float;
  maxOffsetMs?: Int32;
  minOffsetMs?: Int32;
  targetOffsetMs?: Int32;
}

// Native source-embedded buffer config
interface NativeSourceBufferConfig {
  minBufferMs?: Int32;
  maxBufferMs?: Int32;
  bufferForPlaybackMs?: Int32;
  bufferForPlaybackAfterRebufferMs?: Int32;
  backBufferDurationMs?: Int32;
  cacheSizeMB?: Int32;
  live?: NativeBufferConfigLive;
}

interface NativeVideoSource {
  uri?: string;
  type?: string;
  headers?: ReadonlyArray<Readonly<NativeStringMapEntry>>;
  startTime?: Double;
  endTime?: Double;
  isNetwork?: boolean;
  isAsset?: boolean;
  isLocalAssetFile?: boolean;
  shouldCache?: boolean;
  mainVer?: Int32;
  patchVer?: Int32;
  contentStartTime?: Double;
  metadata?: NativeVideoMetadata;
  drm?: NativeSourceDrmConfig;
  cmcd?: NativeCmcdConfiguration;
  textTracksAllowChunklessPreparation?: boolean;
  textTracks?: ReadonlyArray<Readonly<NativeTextTrack>>;
  ad?: NativeAdsConfig;
  minLoadRetryCount?: Int32;
  bufferConfig?: NativeSourceBufferConfig;
}

interface NativeBufferConfig {
  minBufferMs?: Int32;
  maxBufferMs?: Int32;
  bufferForPlaybackMs?: Int32;
  bufferForPlaybackAfterRebufferMs?: Int32;
  backBufferDurationMs?: Int32;
  cacheSizeMB?: Int32;
  live?: NativeBufferConfigLive;
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
  headers?: ReadonlyArray<Readonly<NativeStringMapEntry>>;
  contentId?: string;
  certificateUrl?: string;
  base64Certificate?: boolean;
  multiDrm?: boolean;
  localSourceEncryptionKeyScheme?: string;
}

export type OnVideoLoadStartEvent = Readonly<{
  isNetwork: boolean;
  type: string;
  uri: string;
}>;

export type OnVideoLoadEvent = Readonly<{
  currentTime: Double;
  duration: Double;
  naturalSize: {
    width: Double;
    height: Double;
    orientation: string;
  };
}>;

export type OnVideoErrorEvent = Readonly<{
  error: {
    code: Int32;
    domain: string;
    localizedDescription: string;
    localizedFailureReason: string;
    localizedRecoverySuggestion: string;
    errorString: string;
  };
}>;

export type OnVideoProgressEvent = Readonly<{
  currentTime: Double;
  playableDuration: Double;
  seekableDuration: Double;
}>;

export type OnVideoSeekEvent = Readonly<{
  currentTime: Double;
  seekTime: Double;
}>;

export type OnVideoBufferEvent = Readonly<{
  isBuffering: boolean;
}>;

export type OnVideoBandwidthUpdateEvent = Readonly<{
  bitrate: Double;
  width: Int32;
  height: Int32;
}>;

export type OnVideoPlaybackStateChangedEvent = Readonly<{
  isPlaying: boolean;
  isSeeking: boolean;
  isLooping: boolean;
}>;

export type OnVideoPlaybackRateChangeEvent = Readonly<{
  playbackRate: Float;
}>;

export type OnVideoVolumeChangeEvent = Readonly<{
  volume: Float;
}>;

export type OnVideoAudioFocusChangedEvent = Readonly<{
  hasAudioFocus: boolean;
}>;

export type OnVideoPictureInPictureStatusChangedEvent = Readonly<{
  isActive: boolean;
}>;

export type OnVideoControlsVisibilityChangeEvent = Readonly<{
  isVisible: boolean;
}>;

export type OnVideoExternalPlaybackChangeEvent = Readonly<{
  isExternalPlaybackActive: boolean;
}>;

export type OnVideoAspectRatioEvent = Readonly<{
  width: Double;
  height: Double;
}>;

export type TransferEndEvent = Readonly<{
  uri: string;
  bytesTransferred: Double;
}>;

export interface NativeProps extends ViewProps {
  // Progress
  progressUpdateInterval?: Double;

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
  disableAudioFocus?: boolean;
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
  textTracks?: ReadonlyArray<Readonly<NativeTextTrack>>;

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
  onVideoLoadStart?: DirectEventHandler<OnVideoLoadStartEvent>;
  onVideoLoad?: DirectEventHandler<OnVideoLoadEvent>;
  onVideoError?: DirectEventHandler<OnVideoErrorEvent>;
  onVideoProgress?: DirectEventHandler<OnVideoProgressEvent>;
  onVideoSeek?: DirectEventHandler<OnVideoSeekEvent>;
  onVideoEnd?: DirectEventHandler<null>;
  onVideoBuffer?: DirectEventHandler<OnVideoBufferEvent>;
  onVideoBandwidthUpdate?: DirectEventHandler<OnVideoBandwidthUpdateEvent>;
  onVideoPlaybackStateChanged?: DirectEventHandler<OnVideoPlaybackStateChangedEvent>;
  onVideoPlaybackRateChange?: DirectEventHandler<OnVideoPlaybackRateChangeEvent>;
  onVideoVolumeChange?: DirectEventHandler<OnVideoVolumeChangeEvent>;
  onVideoIdle?: DirectEventHandler<null>;
  onVideoReadyForDisplay?: DirectEventHandler<null>;
  onVideoAudioFocusChanged?: DirectEventHandler<OnVideoAudioFocusChangedEvent>;
  onVideoAudioBecomingNoisy?: DirectEventHandler<null>;
  onVideoFullscreenPlayerWillPresent?: DirectEventHandler<null>;
  onVideoFullscreenPlayerDidPresent?: DirectEventHandler<null>;
  onVideoFullscreenPlayerWillDismiss?: DirectEventHandler<null>;
  onVideoFullscreenPlayerDidDismiss?: DirectEventHandler<null>;
  onVideoPictureInPictureStatusChanged?: DirectEventHandler<OnVideoPictureInPictureStatusChangedEvent>;
  onVideoRestoreUserInterfaceForPictureInPictureStop?: DirectEventHandler<null>;
  onVideoControlsVisibilityChange?: DirectEventHandler<OnVideoControlsVisibilityChangeEvent>;
  onVideoExternalPlaybackChange?: DirectEventHandler<OnVideoExternalPlaybackChangeEvent>;
  onVideoAspectRatio?: DirectEventHandler<OnVideoAspectRatioEvent>;
  onTransferEnd?: DirectEventHandler<TransferEndEvent>;
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
