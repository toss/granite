import type { StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';
import type {
  OnVideoLoadStartEvent,
  OnVideoLoadEvent,
  OnVideoProgressEvent,
  OnVideoSeekEvent,
  OnVideoBufferEvent,
  OnVideoBandwidthUpdateEvent,
  OnVideoPlaybackStateChangedEvent,
  OnVideoPlaybackRateChangeEvent,
  OnVideoVolumeChangeEvent,
  OnVideoAudioFocusChangedEvent,
  OnVideoPictureInPictureStatusChangedEvent,
  OnVideoControlsVisibilityChangeEvent,
  OnVideoExternalPlaybackChangeEvent,
  OnVideoAspectRatioEvent,
  OnVideoErrorEvent,
} from './GraniteVideoNativeComponent';

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
  localSourceEncryptionKeyScheme?: string; // iOS Only: offline DRM key scheme
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

// CMCD (Common Media Client Data) - Android Only
export enum CmcdMode {
  MODE_REQUEST_HEADER = 0,
  MODE_QUERY_PARAMETER = 1,
}

export type CmcdData = Record<string, string>;

export type CmcdConfiguration = Readonly<{
  mode?: CmcdMode;
  request?: CmcdData;
  session?: CmcdData;
  object?: CmcdData;
  status?: CmcdData;
}>;

export type Cmcd = boolean | CmcdConfiguration;

// Ad configuration
export type AdConfigCSAI = Readonly<{
  type: 'csai';
  adTagUrl: string;
  adLanguage?: string;
}>;

export type AdConfigDAI = Readonly<{
  type: 'ssai';
  streamType: 'vod' | 'live';
  contentSourceId?: string;
  videoId?: string;
  assetKey?: string;
  format?: 'hls' | 'dash';
  adTagParameters?: Record<string, string>;
  fallbackUri?: string;
  adLanguage?: string;
}>;

export type AdConfig = AdConfigCSAI | AdConfigDAI;

export interface VideoSource {
  uri?: string;
  type?: string;
  mainVer?: number;
  patchVer?: number;
  headers?: VideoSourceHeaders;
  startTime?: number;
  endTime?: number;
  drm?: DrmConfig;
  textTracks?: TextTrack[];
  metadata?: VideoMetadata;
  shouldCache?: boolean;
  isNetwork?: boolean;
  isAsset?: boolean;
  isLocalAssetFile?: boolean;
  contentStartTime?: number;
  minLoadRetryCount?: number;
  textTracksAllowChunklessPreparation?: boolean;
  cmcd?: Cmcd;
  ad?: AdConfig;
  bufferConfig?: BufferConfig;
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

export type OnLoadData = OnVideoLoadEvent & {
  naturalSize: OnVideoLoadEvent['naturalSize'] & {
    orientation: 'portrait' | 'landscape';
  };
  audioTracks: AudioTrack[];
  textTracks: TextTrackInfo[];
  videoTracks: VideoTrackInfo[];
};

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

export type OnSeekData = OnVideoSeekEvent & {
  target?: number;
};

export interface OnTimedMetadataData {
  metadata: Array<{
    value: string;
    identifier: string;
  }>;
}

export interface OnReceiveAdEventData {
  event: string;
}

export interface OnTransferEndData {
  uri: string;
  bytesTransferred: number;
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

  /**
   * Callback when video starts loading
   */
  onLoadStart?: (data: OnVideoLoadStartEvent) => void;

  /**
   * Callback when video is loaded
   */
  onLoad?: (data: OnLoadData) => void;

  /**
   * Callback when video fails to load
   */
  onError?: (data: OnVideoErrorEvent) => void;

  /**
   * Callback during video playback progress
   */
  onProgress?: (data: OnVideoProgressEvent) => void;

  /**
   * Callback when video seek completes
   */
  onSeek?: (data: OnSeekData) => void;

  /**
   * Callback when video ends
   */
  onEnd?: () => void;

  /**
   * Callback when video buffering state changes
   */
  onBuffer?: (data: OnVideoBufferEvent) => void;

  /**
   * Callback when video bandwidth updates
   */
  onBandwidthUpdate?: (data: OnVideoBandwidthUpdateEvent) => void;

  /**
   * Callback when playback state changes
   */
  onPlaybackStateChanged?: (data: OnVideoPlaybackStateChangedEvent) => void;

  /**
   * Callback when playback rate changes
   */
  onPlaybackRateChange?: (data: OnVideoPlaybackRateChangeEvent) => void;

  /**
   * Callback when volume changes
   */
  onVolumeChange?: (data: OnVideoVolumeChangeEvent) => void;

  /**
   * Callback when video becomes idle
   */
  onIdle?: () => void;

  /**
   * Callback when video is ready for display
   */
  onReadyForDisplay?: () => void;

  /**
   * Callback when video aspect ratio changes
   */
  onAspectRatio?: (data: OnVideoAspectRatioEvent) => void;

  /**
   * Callback when audio focus changes
   */
  onAudioFocusChanged?: (data: OnVideoAudioFocusChangedEvent) => void;

  /**
   * Callback when audio becomes noisy
   */
  onAudioBecomingNoisy?: () => void;

  /**
   * Callback before fullscreen player presents
   */
  onFullscreenPlayerWillPresent?: () => void;

  /**
   * Callback after fullscreen player presents
   */
  onFullscreenPlayerDidPresent?: () => void;

  /**
   * Callback before fullscreen player dismisses
   */
  onFullscreenPlayerWillDismiss?: () => void;

  /**
   * Callback after fullscreen player dismisses
   */
  onFullscreenPlayerDidDismiss?: () => void;

  /**
   * Callback when picture-in-picture status changes
   */
  onPictureInPictureStatusChanged?: (data: OnVideoPictureInPictureStatusChangedEvent) => void;

  /**
   * Callback to restore user interface for picture-in-picture stop
   */
  onRestoreUserInterfaceForPictureInPictureStop?: () => void;

  /**
   * Callback when controls visibility changes
   */
  onControlsVisibilityChange?: (data: OnVideoControlsVisibilityChangeEvent) => void;

  /**
   * Callback when external playback changes
   */
  onExternalPlaybackChange?: (data: OnVideoExternalPlaybackChangeEvent) => void;

  /**
   * Callback when receive ad event occurs
   */
  onReceiveAdEvent?: (data: OnReceiveAdEventData) => void;

  /**
   * Callback when transfer end event occurs
   */
  onTransferEnd?: (data: OnTransferEndData) => void;
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
