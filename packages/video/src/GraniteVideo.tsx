import React, { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Image,
  findNodeHandle,
  NativeModules,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import NativeGraniteVideoView, { Commands, type NativeProps } from './GraniteVideoNativeComponent';
import type {
  VideoRef,
  VideoSource,
  OnLoadStartData,
  OnLoadData,
  OnProgressData,
  OnSeekData,
  OnBufferData,
  OnBandwidthUpdateData,
  OnVideoErrorData,
  OnPlaybackStateChangedData,
  OnPlaybackRateChangeData,
  OnVolumeChangeData,
  OnPictureInPictureStatusChangedData,
  OnControlsVisibilityChangeData,
  OnExternalPlaybackChangeData,
  OnAudioFocusChangedData,
  OnVideoAspectRatioData,
  VideoProps,
} from './types';

const { GraniteVideoModule } = NativeModules;

// For Fabric (New Architecture), the component is always available through codegenNativeComponent
// We don't need to check UIManager.getViewManagerConfig which is Old Architecture only

function normalizeSource(source: VideoSource | number): NativeProps['source'] | undefined {
  if (typeof source === 'number') {
    // require() - not yet supported in native
    return undefined;
  }

  return {
    uri: source.uri,
    type: source.type,
    startPosition: source.startPosition,
    cropStart: source.cropStart,
    cropEnd: source.cropEnd,
  };
}

function normalizeSelectedTrack(
  track?: VideoProps['selectedAudioTrack']
): NativeProps['selectedAudioTrack'] | undefined {
  if (!track) {
    return undefined;
  }
  return {
    type: track.type,
    value: track.value?.toString(),
  };
}

function normalizeSelectedVideoTrack(
  track?: VideoProps['selectedVideoTrack']
): NativeProps['selectedVideoTrack'] | undefined {
  if (!track) {
    return undefined;
  }
  return {
    type: track.type,
    value: track.value,
  };
}

function normalizeDrm(drm?: VideoProps['drm']): NativeProps['drm'] | undefined {
  if (!drm) {
    return undefined;
  }
  return {
    type: drm.type,
    licenseServer: drm.licenseServer,
    contentId: drm.contentId,
    certificateUrl: drm.certificateUrl,
    base64Certificate: drm.base64Certificate,
  };
}

function normalizeBufferConfig(config?: VideoProps['bufferConfig']): NativeProps['bufferConfig'] | undefined {
  if (!config) {
    return undefined;
  }
  return {
    minBufferMs: config.minBufferMs,
    maxBufferMs: config.maxBufferMs,
    bufferForPlaybackMs: config.bufferForPlaybackMs,
    bufferForPlaybackAfterRebufferMs: config.bufferForPlaybackAfterRebufferMs,
    backBufferDurationMs: config.backBufferDurationMs,
    cacheSizeMB: config.cacheSizeMB,
  };
}

function getPosterUri(poster?: VideoProps['poster']): string | undefined {
  if (!poster) {
    return undefined;
  }
  if (typeof poster === 'string') {
    return poster;
  }
  if (typeof poster === 'object' && 'uri' in poster && poster.uri) {
    return poster.uri;
  }
  const resolved = Image.resolveAssetSource(poster as any);
  return resolved?.uri;
}

const VideoBase = forwardRef<VideoRef, VideoProps>((props, ref) => {
  const {
    // Test ID
    testID,
    // Style
    style,
    // Source
    source,
    // Poster
    poster,
    posterResizeMode = 'contain',
    // Playback Control
    paused = false,
    muted = false,
    volume = 1.0,
    rate = 1.0,
    repeat = false,
    playInBackground = false,
    playWhenInactive = false,
    automaticallyWaitsToMinimizeStalling = true,
    shutterColor,
    // Display
    resizeMode = 'contain',
    viewType = 'surface',
    useTextureView = false,
    useSecureView = false,
    // Buffering
    bufferConfig,
    minLoadRetryCount = 3,
    maxBitRate,
    preferredForwardBufferDuration,
    // Track Selection
    selectedAudioTrack,
    selectedTextTrack,
    selectedVideoTrack,
    // DRM
    drm,
    localSourceEncryptionKeyScheme,
    // Ads
    adTagUrl,
    adLanguage,
    // Controls
    controls = false,
    showNotificationControls = false,
    disableFocus = false,
    disableDisconnectError = false,
    focusable = true,
    hideShutterView = false,
    preventsDisplaySleepDuringVideoPlayback = true,
    // Fullscreen
    fullscreen = false,
    fullscreenAutorotate = true,
    fullscreenOrientation = 'all',
    // Picture in Picture
    pictureInPicture = false,
    // Content
    contentStartTime,
    allowsExternalPlayback = true,
    audioOutput = 'speaker',
    ignoreSilentSwitch = 'inherit',
    mixWithOthers = 'inherit',
    // Debug
    debug,
    // Events
    onLoadStart,
    onLoad,
    onError,
    onProgress,
    onSeek,
    onEnd,
    onBuffer,
    onBandwidthUpdate,
    onPlaybackStateChanged,
    onPlaybackRateChange,
    onVolumeChange,
    onIdle,
    onReadyForDisplay,
    onAudioFocusChanged,
    onAudioBecomingNoisy,
    onFullscreenPlayerWillPresent,
    onFullscreenPlayerDidPresent,
    onFullscreenPlayerWillDismiss,
    onFullscreenPlayerDidDismiss,
    onPictureInPictureStatusChanged,
    onRestoreUserInterfaceForPictureInPictureStop,
    onControlsVisibilityChange,
    onExternalPlaybackChange,
    onAspectRatio,
  } = props;

  const nativeRef = useRef<React.ElementRef<typeof NativeGraniteVideoView>>(null);

  // === Imperative Handle ===
  useImperativeHandle(ref, () => ({
    seek: (time: number, tolerance?: number) => {
      if (nativeRef.current) {
        Commands.seek(nativeRef.current, time, tolerance ?? 0);
      }
    },
    pause: () => {
      if (nativeRef.current) {
        Commands.pause(nativeRef.current);
      }
    },
    resume: () => {
      if (nativeRef.current) {
        Commands.resume(nativeRef.current);
      }
    },
    setVolume: (vol: number) => {
      if (nativeRef.current) {
        Commands.adjustVolume(nativeRef.current, vol);
      }
    },
    setFullScreen: (fs: boolean) => {
      if (nativeRef.current) {
        Commands.setFullScreen(nativeRef.current, fs);
      }
    },
    presentFullscreenPlayer: () => {
      if (nativeRef.current) {
        Commands.setFullScreen(nativeRef.current, true);
      }
    },
    dismissFullscreenPlayer: () => {
      if (nativeRef.current) {
        Commands.setFullScreen(nativeRef.current, false);
      }
    },
    enterPictureInPicture: () => {
      if (nativeRef.current) {
        Commands.enterPictureInPicture(nativeRef.current);
      }
    },
    exitPictureInPicture: () => {
      if (nativeRef.current) {
        Commands.exitPictureInPicture(nativeRef.current);
      }
    },
    setSource: (newSource: VideoSource) => {
      if (nativeRef.current && newSource.uri) {
        Commands.loadSource(nativeRef.current, newSource.uri);
      }
    },
    getCurrentPosition: async () => {
      const handle = findNodeHandle(nativeRef.current);
      if (handle && GraniteVideoModule?.getCurrentPosition) {
        return GraniteVideoModule.getCurrentPosition(handle);
      }
      return 0;
    },
    save: async (options?: { type?: string }) => {
      const handle = findNodeHandle(nativeRef.current);
      if (handle && GraniteVideoModule?.save) {
        return GraniteVideoModule.save(handle, options ?? {});
      }
      return { uri: '' };
    },
    restoreUserInterfaceForPictureInPictureStopCompleted: () => {
      // iOS specific - handled internally
    },
  }));

  // === Event Handlers ===
  const handleLoadStart = useCallback(
    (event: { nativeEvent: OnLoadStartData }) => {
      onLoadStart?.(event.nativeEvent);
    },
    [onLoadStart]
  );

  const handleLoad = useCallback(
    (event: { nativeEvent: OnLoadData }) => {
      onLoad?.(event.nativeEvent);
    },
    [onLoad]
  );

  const handleError = useCallback(
    (event: { nativeEvent: OnVideoErrorData }) => {
      onError?.(event.nativeEvent);
    },
    [onError]
  );

  const handleProgress = useCallback(
    (event: { nativeEvent: OnProgressData }) => {
      onProgress?.(event.nativeEvent);
    },
    [onProgress]
  );

  const handleSeek = useCallback(
    (event: { nativeEvent: OnSeekData }) => {
      onSeek?.(event.nativeEvent);
    },
    [onSeek]
  );

  const handleEnd = useCallback(() => {
    onEnd?.();
  }, [onEnd]);

  const handleBuffer = useCallback(
    (event: { nativeEvent: OnBufferData }) => {
      onBuffer?.(event.nativeEvent);
    },
    [onBuffer]
  );

  const handleBandwidthUpdate = useCallback(
    (event: { nativeEvent: OnBandwidthUpdateData }) => {
      onBandwidthUpdate?.(event.nativeEvent);
    },
    [onBandwidthUpdate]
  );

  const handlePlaybackStateChanged = useCallback(
    (event: { nativeEvent: OnPlaybackStateChangedData }) => {
      onPlaybackStateChanged?.(event.nativeEvent);
    },
    [onPlaybackStateChanged]
  );

  const handlePlaybackRateChange = useCallback(
    (event: { nativeEvent: OnPlaybackRateChangeData }) => {
      onPlaybackRateChange?.(event.nativeEvent);
    },
    [onPlaybackRateChange]
  );

  const handleVolumeChange = useCallback(
    (event: { nativeEvent: OnVolumeChangeData }) => {
      onVolumeChange?.(event.nativeEvent);
    },
    [onVolumeChange]
  );

  const handleIdle = useCallback(() => {
    onIdle?.();
  }, [onIdle]);

  const handleReadyForDisplay = useCallback(() => {
    onReadyForDisplay?.();
  }, [onReadyForDisplay]);

  const handleAudioFocusChanged = useCallback(
    (event: { nativeEvent: OnAudioFocusChangedData }) => {
      onAudioFocusChanged?.(event.nativeEvent);
    },
    [onAudioFocusChanged]
  );

  const handleAudioBecomingNoisy = useCallback(() => {
    onAudioBecomingNoisy?.();
  }, [onAudioBecomingNoisy]);

  const handleFullscreenPlayerWillPresent = useCallback(() => {
    onFullscreenPlayerWillPresent?.();
  }, [onFullscreenPlayerWillPresent]);

  const handleFullscreenPlayerDidPresent = useCallback(() => {
    onFullscreenPlayerDidPresent?.();
  }, [onFullscreenPlayerDidPresent]);

  const handleFullscreenPlayerWillDismiss = useCallback(() => {
    onFullscreenPlayerWillDismiss?.();
  }, [onFullscreenPlayerWillDismiss]);

  const handleFullscreenPlayerDidDismiss = useCallback(() => {
    onFullscreenPlayerDidDismiss?.();
  }, [onFullscreenPlayerDidDismiss]);

  const handlePictureInPictureStatusChanged = useCallback(
    (event: { nativeEvent: OnPictureInPictureStatusChangedData }) => {
      onPictureInPictureStatusChanged?.(event.nativeEvent);
    },
    [onPictureInPictureStatusChanged]
  );

  const handleRestoreUserInterfaceForPictureInPictureStop = useCallback(() => {
    onRestoreUserInterfaceForPictureInPictureStop?.();
  }, [onRestoreUserInterfaceForPictureInPictureStop]);

  const handleControlsVisibilityChange = useCallback(
    (event: { nativeEvent: OnControlsVisibilityChangeData }) => {
      onControlsVisibilityChange?.(event.nativeEvent);
    },
    [onControlsVisibilityChange]
  );

  const handleExternalPlaybackChange = useCallback(
    (event: { nativeEvent: OnExternalPlaybackChangeData }) => {
      onExternalPlaybackChange?.(event.nativeEvent);
    },
    [onExternalPlaybackChange]
  );

  const handleAspectRatio = useCallback(
    (event: { nativeEvent: OnVideoAspectRatioData }) => {
      onAspectRatio?.(event.nativeEvent);
    },
    [onAspectRatio]
  );

  // === Render ===
  const containerStyle: StyleProp<ViewStyle> = [styles.container, style];

  return (
    <View style={containerStyle} testID={testID}>
      <NativeGraniteVideoView
        ref={nativeRef}
        style={styles.video}
        source={normalizeSource(source)}
        poster={getPosterUri(poster)}
        posterResizeMode={posterResizeMode}
        paused={paused}
        muted={muted}
        volume={volume}
        rate={rate}
        repeat={repeat}
        playInBackground={playInBackground}
        playWhenInactive={playWhenInactive}
        automaticallyWaitsToMinimizeStalling={automaticallyWaitsToMinimizeStalling}
        shutterColor={shutterColor}
        resizeMode={resizeMode}
        viewType={viewType}
        useTextureView={useTextureView}
        useSecureView={useSecureView}
        bufferConfig={normalizeBufferConfig(bufferConfig)}
        minLoadRetryCount={minLoadRetryCount}
        maxBitRate={maxBitRate}
        preferredForwardBufferDuration={preferredForwardBufferDuration}
        selectedAudioTrack={normalizeSelectedTrack(selectedAudioTrack)}
        selectedTextTrack={normalizeSelectedTrack(selectedTextTrack)}
        selectedVideoTrack={normalizeSelectedVideoTrack(selectedVideoTrack)}
        drm={normalizeDrm(drm)}
        localSourceEncryptionKeyScheme={localSourceEncryptionKeyScheme}
        adTagUrl={adTagUrl}
        adLanguage={adLanguage}
        controls={controls}
        showNotificationControls={showNotificationControls}
        disableFocus={disableFocus}
        disableDisconnectError={disableDisconnectError}
        focusable={focusable}
        hideShutterView={hideShutterView}
        preventsDisplaySleepDuringVideoPlayback={preventsDisplaySleepDuringVideoPlayback}
        fullscreen={fullscreen}
        fullscreenAutorotate={fullscreenAutorotate}
        fullscreenOrientation={fullscreenOrientation}
        pictureInPicture={pictureInPicture}
        contentStartTime={contentStartTime}
        allowsExternalPlayback={allowsExternalPlayback}
        audioOutput={audioOutput}
        ignoreSilentSwitch={ignoreSilentSwitch}
        mixWithOthers={mixWithOthers}
        enableDebug={debug?.enable}
        enableDebugThread={debug?.thread}
        onVideoLoadStart={handleLoadStart as any}
        onVideoLoad={handleLoad as any}
        onVideoError={handleError as any}
        onVideoProgress={handleProgress as any}
        onVideoSeek={handleSeek as any}
        onVideoEnd={handleEnd as any}
        onVideoBuffer={handleBuffer as any}
        onVideoBandwidthUpdate={handleBandwidthUpdate as any}
        onVideoPlaybackStateChanged={handlePlaybackStateChanged as any}
        onVideoPlaybackRateChange={handlePlaybackRateChange as any}
        onVideoVolumeChange={handleVolumeChange as any}
        onVideoIdle={handleIdle as any}
        onVideoReadyForDisplay={handleReadyForDisplay as any}
        onVideoAudioFocusChanged={handleAudioFocusChanged as any}
        onVideoAudioBecomingNoisy={handleAudioBecomingNoisy as any}
        onVideoFullscreenPlayerWillPresent={handleFullscreenPlayerWillPresent as any}
        onVideoFullscreenPlayerDidPresent={handleFullscreenPlayerDidPresent as any}
        onVideoFullscreenPlayerWillDismiss={handleFullscreenPlayerWillDismiss as any}
        onVideoFullscreenPlayerDidDismiss={handleFullscreenPlayerDidDismiss as any}
        onVideoPictureInPictureStatusChanged={handlePictureInPictureStatusChanged as any}
        onVideoRestoreUserInterfaceForPictureInPictureStop={handleRestoreUserInterfaceForPictureInPictureStop as any}
        onVideoControlsVisibilityChange={handleControlsVisibilityChange as any}
        onVideoExternalPlaybackChange={handleExternalPlaybackChange as any}
        onVideoAspectRatio={handleAspectRatio as any}
      />
    </View>
  );
});

VideoBase.displayName = 'Video';

// Type for GraniteVideo with static properties
type VideoComponent = typeof VideoBase & {
  isAvailable: boolean;
};

// Static property to indicate availability
// For Fabric (New Architecture), the component is always available
(VideoBase as VideoComponent).isAvailable = true;

export const Video = VideoBase as VideoComponent;

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});

// === Static Methods ===
export async function clearCache(): Promise<void> {
  if (GraniteVideoModule?.clearCache) {
    return GraniteVideoModule.clearCache();
  }
}

export async function getWidevineLevel(): Promise<number> {
  if (Platform.OS === 'android' && GraniteVideoModule?.getWidevineLevel) {
    return GraniteVideoModule.getWidevineLevel();
  }
  return 0;
}

export async function isCodecSupported(mimeType: string, width: number, height: number): Promise<boolean> {
  if (GraniteVideoModule?.isCodecSupported) {
    return GraniteVideoModule.isCodecSupported(mimeType, width, height);
  }
  return false;
}

export async function isHEVCSupported(): Promise<boolean> {
  if (GraniteVideoModule?.isHEVCSupported) {
    return GraniteVideoModule.isHEVCSupported();
  }
  return false;
}
