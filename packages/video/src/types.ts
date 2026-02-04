import type { StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';

// ============================================================
// Source Types
// ============================================================

export interface VideoSourceHeaders {
  [key: string]: string;
}

export interface DrmConfig {
  type: 'widevine' | 'playready' | 'clearkey' | 'fairplay';
  licenseServer?: string;
  headers?: VideoSourceHeaders;
  contentId?: string;
  certificateUrl?: string;
  base64Certificate?: boolean;
  multiDrm?: boolean;
}

export interface TextTrack {
  title: string;
  language: string;
  type: 'application/x-subrip' | 'text/vtt' | 'application/ttml+xml';
  uri: string;
}

export interface BufferConfig {
  minBufferMs?: number;
  maxBufferMs?: number;
  bufferForPlaybackMs?: number;
  bufferForPlaybackAfterRebufferMs?: number;
  backBufferDurationMs?: number;
  cacheSizeMB?: number;
  live?: {
    maxPlaybackSpeed?: number;
    minPlaybackSpeed?: number;
    maxOffsetMs?: number;
    minOffsetMs?: number;
    targetOffsetMs?: number;
  };
}

export interface VideoSource {
  uri?: string;
  type?: string;
  mainVer?: number;
  patchVer?: number;
  headers?: VideoSourceHeaders;
  startPosition?: number;
  cropStart?: number;
  cropEnd?: number;
  drm?: DrmConfig;
  textTracks?: TextTrack[];
  metadata?: VideoMetadata;
}

export interface VideoMetadata {
  title?: string;
  subtitle?: string;
  description?: string;
  artist?: string;
  imageUri?: string;
}

// ============================================================
// Track Selection Types
// ============================================================

export type SelectedTrackType = 'system' | 'disabled' | 'title' | 'language' | 'index';
export type SelectedVideoTrackType = 'auto' | 'disabled' | 'resolution' | 'index';

export interface SelectedTrack {
  type: SelectedTrackType;
  value?: string | number;
}

export interface SelectedVideoTrack {
  type: SelectedVideoTrackType;
  value?: number;
}

// ============================================================
// Resize Mode
// ============================================================

export type ResizeMode = 'contain' | 'cover' | 'stretch' | 'none';

// ============================================================
// View Type (Android)
// ============================================================

export type ViewType = 'surface' | 'texture';

// ============================================================
// Poster Source
// ============================================================

export interface PosterSource {
  uri?: string;
}

export type Poster = ImageSourcePropType | PosterSource;

// ============================================================
// Event Data Types
// ============================================================

export interface OnLoadStartData {
  isNetwork: boolean;
  type: string;
  uri: string;
}

export interface OnLoadData {
  currentTime: number;
  duration: number;
  naturalSize: {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
  };
  audioTracks: AudioTrack[];
  textTracks: TextTrackInfo[];
  videoTracks: VideoTrackInfo[];
}

export interface AudioTrack {
  index: number;
  title?: string;
  language?: string;
  bitrate?: number;
  type?: string;
  selected?: boolean;
}

export interface TextTrackInfo {
  index: number;
  title?: string;
  language?: string;
  type?: string;
  selected?: boolean;
}

export interface VideoTrackInfo {
  index: number;
  trackId?: string;
  codecs?: string;
  width?: number;
  height?: number;
  bitrate?: number;
  selected?: boolean;
}

export interface OnProgressData {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
}

export interface OnSeekData {
  currentTime: number;
  seekTime: number;
}

export interface OnBufferData {
  isBuffering: boolean;
}

export interface OnBandwidthUpdateData {
  bitrate: number;
  width?: number;
  height?: number;
}

export interface OnVideoErrorData {
  error: {
    code: number;
    domain?: string;
    localizedDescription?: string;
    localizedFailureReason?: string;
    localizedRecoverySuggestion?: string;
    errorString?: string;
  };
}

export interface OnAudioFocusChangedData {
  hasAudioFocus: boolean;
}

export interface OnPlaybackStateChangedData {
  isPlaying: boolean;
  isSeeking: boolean;
  isLooping: boolean;
}

export interface OnPlaybackRateChangeData {
  playbackRate: number;
}

export interface OnVolumeChangeData {
  volume: number;
}

export interface OnPictureInPictureStatusChangedData {
  isActive: boolean;
}

export interface OnControlsVisibilityChangeData {
  isVisible: boolean;
}

export interface OnExternalPlaybackChangeData {
  isExternalPlaybackActive: boolean;
}

export interface OnTimedMetadataData {
  metadata: Array<{
    value: string;
    identifier: string;
  }>;
}

export interface OnAudioTracksData {
  audioTracks: AudioTrack[];
}

export interface OnTextTracksData {
  textTracks: TextTrackInfo[];
}

export interface OnTextTrackDataChangedData {
  subtitleTracks: string;
}

export interface OnVideoTracksData {
  videoTracks: VideoTrackInfo[];
}

export interface OnVideoAspectRatioData {
  width: number;
  height: number;
}

export interface OnReceiveAdEventData {
  event: string;
  data?: {
    [key: string]: string | number | boolean;
  };
}

// ============================================================
// Ref Methods
// ============================================================

export interface VideoRef {
  seek: (time: number, tolerance?: number) => void;
  pause: () => void;
  resume: () => void;
  setVolume: (volume: number) => void;
  setFullScreen: (fullscreen: boolean) => void;
  presentFullscreenPlayer: () => void;
  dismissFullscreenPlayer: () => void;
  enterPictureInPicture: () => void;
  exitPictureInPicture: () => void;
  setSource: (source: VideoSource) => void;
  getCurrentPosition: () => Promise<number>;
  save: (options?: { type?: string }) => Promise<{ uri: string }>;
  restoreUserInterfaceForPictureInPictureStopCompleted: (restored: boolean) => void;
}

// ============================================================
// Component Props
// ============================================================

export interface VideoProps {
  // Test ID
  testID?: string;

  // Style
  style?: StyleProp<ViewStyle>;

  // Progress
  progressUpdateInterval?: number;

  // Source
  source: VideoSource | number;

  /**
   * **NOTE**
   *
   * Value: string with a URL for the poster is deprecated, use poster as an object instead.
   */
  poster?: Poster | string;
  posterResizeMode?: ResizeMode;

  // Playback Control
  paused?: boolean;
  muted?: boolean;
  volume?: number;
  rate?: number;
  repeat?: boolean;
  playInBackground?: boolean;
  playWhenInactive?: boolean;
  automaticallyWaitsToMinimizeStalling?: boolean;
  shutterColor?: string;

  // Display
  resizeMode?: ResizeMode;
  viewType?: ViewType;
  useTextureView?: boolean;
  useSecureView?: boolean;

  // Buffering
  bufferConfig?: BufferConfig;
  minLoadRetryCount?: number;
  maxBitRate?: number;
  preferredForwardBufferDuration?: number;

  // Track Selection
  selectedAudioTrack?: SelectedTrack;
  selectedTextTrack?: SelectedTrack;
  selectedVideoTrack?: SelectedVideoTrack;
  textTracks?: TextTrack[];

  // DRM
  drm?: DrmConfig;
  localSourceEncryptionKeyScheme?: string;

  // Ads (Android/iOS)
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
  fullscreenOrientation?: 'all' | 'landscape' | 'portrait';

  // Picture in Picture
  pictureInPicture?: boolean;

  // Content
  contentStartTime?: number;
  allowsExternalPlayback?: boolean;
  audioOutput?: 'speaker' | 'earpiece';
  ignoreSilentSwitch?: 'inherit' | 'ignore' | 'obey';
  mixWithOthers?: 'inherit' | 'mix' | 'duck';

  // Debug
  debug?: {
    enable?: boolean;
    thread?: boolean;
  };

  // === Events ===

  // Load Events
  onLoadStart?: (data: OnLoadStartData) => void;
  onLoad?: (data: OnLoadData) => void;
  onError?: (data: OnVideoErrorData) => void;

  // Playback Events
  onProgress?: (data: OnProgressData) => void;
  onSeek?: (data: OnSeekData) => void;
  onEnd?: () => void;
  onBuffer?: (data: OnBufferData) => void;
  onBandwidthUpdate?: (data: OnBandwidthUpdateData) => void;
  onPlaybackStateChanged?: (data: OnPlaybackStateChangedData) => void;
  onPlaybackRateChange?: (data: OnPlaybackRateChangeData) => void;
  onVolumeChange?: (data: OnVolumeChangeData) => void;
  onIdle?: () => void;
  onReadyForDisplay?: () => void;

  // Track Events
  onAudioTracks?: (data: OnAudioTracksData) => void;
  onTextTracks?: (data: OnTextTracksData) => void;
  onTextTrackDataChanged?: (data: OnTextTrackDataChangedData) => void;
  onVideoTracks?: (data: OnVideoTracksData) => void;
  onTimedMetadata?: (data: OnTimedMetadataData) => void;
  onAspectRatio?: (data: OnVideoAspectRatioData) => void;

  // Focus Events (Android)
  onAudioFocusChanged?: (data: OnAudioFocusChangedData) => void;
  onAudioBecomingNoisy?: () => void;

  // Fullscreen Events
  onFullscreenPlayerWillPresent?: () => void;
  onFullscreenPlayerDidPresent?: () => void;
  onFullscreenPlayerWillDismiss?: () => void;
  onFullscreenPlayerDidDismiss?: () => void;

  // PIP Events
  onPictureInPictureStatusChanged?: (data: OnPictureInPictureStatusChangedData) => void;
  onRestoreUserInterfaceForPictureInPictureStop?: () => void;

  // Control Events
  onControlsVisibilityChange?: (data: OnControlsVisibilityChangeData) => void;

  // External Playback Events (iOS)
  onExternalPlaybackChange?: (data: OnExternalPlaybackChangeData) => void;

  // Ad Events
  onReceiveAdEvent?: (data: OnReceiveAdEventData) => void;
}

// ============================================================
// Static Methods
// ============================================================

export interface VideoStatic {
  clearCache: () => Promise<void>;
  getWidevineLevel: () => Promise<number>;
  isCodecSupported: (mimeType: string, width: number, height: number) => Promise<boolean>;
  isHEVCSupported: () => Promise<boolean>;
}
