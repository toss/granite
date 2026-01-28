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
type  NativeSyntheticEvent } from 'react-native';
import NativeGraniteVideoView, {
  Commands,
  type NativeProps,
  OnVideoLoadStartEvent,
  OnVideoLoadEvent,
  OnVideoErrorEvent,
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
} from './GraniteVideoNativeComponent';
import type {
  VideoRef,
  VideoSource,
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
    (event: NativeSyntheticEvent<OnVideoLoadStartEvent>) => {
      onLoadStart?.(event);
    },
    [onLoadStart]
  );

  const handleLoad = useCallback(
    (event: NativeSyntheticEvent<OnVideoLoadEvent>) => {
      onLoad?.(event);
    },
    [onLoad]
  );

  const handleError = useCallback(
    (event: NativeSyntheticEvent<OnVideoErrorEvent>) => {
      onError?.(event);
    },
    [onError]
  );

  const handleProgress = useCallback(
    (event: NativeSyntheticEvent<OnVideoProgressEvent>) => {
      onProgress?.(event);
    },
    [onProgress]
  );

  const handleSeek = useCallback(
    (event: NativeSyntheticEvent<OnVideoSeekEvent>) => {
      onSeek?.(event);
    },
    [onSeek]
  );

  const handleEnd = useCallback(() => {
    onEnd?.();
  }, [onEnd]);

  const handleBuffer = useCallback(
    (event: NativeSyntheticEvent<OnVideoBufferEvent>) => {
      onBuffer?.(event);
    },
    [onBuffer]
  );

  const handleBandwidthUpdate = useCallback(
    (event: NativeSyntheticEvent<OnVideoBandwidthUpdateEvent>) => {
      onBandwidthUpdate?.(event);
    },
    [onBandwidthUpdate]
  );

  const handlePlaybackStateChanged = useCallback(
    (event: NativeSyntheticEvent<OnVideoPlaybackStateChangedEvent>) => {
      onPlaybackStateChanged?.(event);
    },
    [onPlaybackStateChanged]
  );

  const handlePlaybackRateChange = useCallback(
    (event: NativeSyntheticEvent<OnVideoPlaybackRateChangeEvent>) => {
      onPlaybackRateChange?.(event);
    },
    [onPlaybackRateChange]
  );

  const handleVolumeChange = useCallback(
    (event: NativeSyntheticEvent<OnVideoVolumeChangeEvent>) => {
      onVolumeChange?.(event);
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
    (event: NativeSyntheticEvent<OnVideoAudioFocusChangedEvent>) => {
      onAudioFocusChanged?.(event);
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
    (event: NativeSyntheticEvent<OnVideoPictureInPictureStatusChangedEvent>) => {
      onPictureInPictureStatusChanged?.(event);
    },
    [onPictureInPictureStatusChanged]
  );

  const handleRestoreUserInterfaceForPictureInPictureStop = useCallback(() => {
    onRestoreUserInterfaceForPictureInPictureStop?.();
  }, [onRestoreUserInterfaceForPictureInPictureStop]);

  const handleControlsVisibilityChange = useCallback(
    (event: NativeSyntheticEvent<OnVideoControlsVisibilityChangeEvent>) => {
      onControlsVisibilityChange?.(event);
    },
    [onControlsVisibilityChange]
  );

  const handleExternalPlaybackChange = useCallback(
    (event: NativeSyntheticEvent<OnVideoExternalPlaybackChangeEvent>) => {
      onExternalPlaybackChange?.(event);
    },
    [onExternalPlaybackChange]
  );

  const handleAspectRatio = useCallback(
    (event: NativeSyntheticEvent<OnVideoAspectRatioEvent>) => {
      onAspectRatio?.(event);
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
        onVideoLoadStart={handleLoadStart}
        onVideoLoad={handleLoad}
        onVideoError={handleError}
        onVideoProgress={handleProgress}
        onVideoSeek={handleSeek}
        onVideoEnd={handleEnd}
        onVideoBuffer={handleBuffer}
        onVideoBandwidthUpdate={handleBandwidthUpdate}
        onVideoPlaybackStateChanged={handlePlaybackStateChanged}
        onVideoPlaybackRateChange={handlePlaybackRateChange}
        onVideoVolumeChange={handleVolumeChange}
        onVideoIdle={handleIdle}
        onVideoReadyForDisplay={handleReadyForDisplay}
        onVideoAudioFocusChanged={handleAudioFocusChanged}
        onVideoAudioBecomingNoisy={handleAudioBecomingNoisy}
        onVideoFullscreenPlayerWillPresent={handleFullscreenPlayerWillPresent}
        onVideoFullscreenPlayerDidPresent={handleFullscreenPlayerDidPresent}
        onVideoFullscreenPlayerWillDismiss={handleFullscreenPlayerWillDismiss}
        onVideoFullscreenPlayerDidDismiss={handleFullscreenPlayerDidDismiss}
        onVideoPictureInPictureStatusChanged={handlePictureInPictureStatusChanged}
        onVideoRestoreUserInterfaceForPictureInPictureStop={handleRestoreUserInterfaceForPictureInPictureStop}
        onVideoControlsVisibilityChange={handleControlsVisibilityChange}
        onVideoExternalPlaybackChange={handleExternalPlaybackChange}
        onVideoAspectRatio={handleAspectRatio}
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
