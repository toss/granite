#import <UIKit/UIKit.h>
#import <AVKit/AVKit.h>

#import <React/RCTViewComponentView.h>
#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import <React/RCTComponentViewFactory.h>

#import <react/renderer/components/GraniteVideoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/GraniteVideoViewSpec/EventEmitters.h>
#import <react/renderer/components/GraniteVideoViewSpec/Props.h>
#import <react/renderer/components/GraniteVideoViewSpec/RCTComponentViewHelpers.h>

// Import Swift module - the header is generated during build
#if __has_include(<GraniteVideo/GraniteVideo-Swift.h>)
#import <GraniteVideo/GraniteVideo-Swift.h>
#elif __has_include(<granite_video/granite_video-Swift.h>)
#import <granite_video/granite_video-Swift.h>
#else
#import "GraniteVideo-Swift.h"
#endif

using namespace facebook::react;

// Define GraniteVideoView inheriting from RCTViewComponentView here in .mm file
// The header declares it as UIView to avoid exposing C++ headers to Swift module
@interface GraniteVideoView : RCTViewComponentView <RCTGraniteVideoViewViewProtocol, GraniteVideoDelegate>
@end

@implementation GraniteVideoView {
    UIView *_playerView;
    id<GraniteVideoProvidable> _provider;
    BOOL _paused;
    float _volume;
    float _rate;
    BOOL _muted;
    BOOL _repeat;
    NSString *_resizeMode;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<GraniteVideoViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const GraniteVideoViewProps>();
        _props = defaultProps;

        // Default values
        _paused = NO;
        _volume = 1.0f;
        _rate = 1.0f;
        _muted = NO;
        _repeat = NO;
        _resizeMode = @"contain";

        // Create provider from registry
        _provider = [[GraniteVideoRegistry shared] createProvider];

#if defined(GRANITE_VIDEO_DEFAULT_PROVIDER)
        if (_provider == nil) {
            // Use default AVPlayer provider
            _provider = [[AVPlayerProvider alloc] init];
        }
#endif

        if (_provider == nil) {
            NSLog(@"[GraniteVideo] No provider registered. Register a provider in AppDelegate or use default AVPlayer provider.");
            return self;
        }

        [_provider setDelegate:self];

        // Create player view
        _playerView = [_provider createPlayerView];
        _playerView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

        self.contentView = _playerView;
    }

    return self;
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    _playerView.frame = self.bounds;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<GraniteVideoViewProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<GraniteVideoViewProps const>(props);

    // Source
    if (newViewProps.source.uri != oldViewProps.source.uri ||
        newViewProps.source.type != oldViewProps.source.type) {
        [self updateSource:newViewProps.source];
    }

    // Paused
    if (newViewProps.paused != oldViewProps.paused) {
        _paused = newViewProps.paused;
        if (_paused) {
            [_provider pause];
        } else {
            [_provider play];
        }
    }

    // Muted
    if (newViewProps.muted != oldViewProps.muted) {
        _muted = newViewProps.muted;
        if ([_provider respondsToSelector:@selector(setMuted:)]) {
            [_provider setMuted:_muted];
        }
    }

    // Volume
    if (newViewProps.volume != oldViewProps.volume) {
        _volume = newViewProps.volume;
        if ([_provider respondsToSelector:@selector(setVolume:)]) {
            [_provider setVolume:_volume];
        }
    }

    // Rate
    if (newViewProps.rate != oldViewProps.rate) {
        _rate = newViewProps.rate;
        if ([_provider respondsToSelector:@selector(setRate:)]) {
            [_provider setRate:_rate];
        }
    }

    // Repeat
    if (newViewProps.repeat != oldViewProps.repeat) {
        _repeat = newViewProps.repeat;
        if ([_provider respondsToSelector:@selector(setRepeat:)]) {
            [_provider setRepeat:_repeat];
        }
    }

    // Resize Mode
    if (newViewProps.resizeMode != oldViewProps.resizeMode) {
        _resizeMode = [NSString stringWithUTF8String:newViewProps.resizeMode.c_str()];
        [self updateResizeMode:_resizeMode];
    }

    // Controls
    if (newViewProps.controls != oldViewProps.controls) {
        if ([_provider respondsToSelector:@selector(setControlsEnabled:)]) {
            [_provider setControlsEnabled:newViewProps.controls];
        }
    }

    // Fullscreen
    if (newViewProps.fullscreen != oldViewProps.fullscreen) {
        if ([_provider respondsToSelector:@selector(setFullscreen:animated:)]) {
            [_provider setFullscreen:newViewProps.fullscreen animated:YES];
        }
    }

    // Picture in Picture
    if (newViewProps.pictureInPicture != oldViewProps.pictureInPicture) {
        if ([_provider respondsToSelector:@selector(setPictureInPictureEnabled:)]) {
            [_provider setPictureInPictureEnabled:newViewProps.pictureInPicture];
        }
    }

    // Play in Background
    if (newViewProps.playInBackground != oldViewProps.playInBackground) {
        if ([_provider respondsToSelector:@selector(setPlayInBackground:)]) {
            [_provider setPlayInBackground:newViewProps.playInBackground];
        }
    }

    // Play when Inactive
    if (newViewProps.playWhenInactive != oldViewProps.playWhenInactive) {
        if ([_provider respondsToSelector:@selector(setPlayWhenInactive:)]) {
            [_provider setPlayWhenInactive:newViewProps.playWhenInactive];
        }
    }

    // Max Bit Rate
    if (newViewProps.maxBitRate != oldViewProps.maxBitRate) {
        if ([_provider respondsToSelector:@selector(setMaxBitRate:)]) {
            [_provider setMaxBitRate:newViewProps.maxBitRate];
        }
    }

    // Preferred Forward Buffer Duration
    if (newViewProps.preferredForwardBufferDuration != oldViewProps.preferredForwardBufferDuration) {
        if ([_provider respondsToSelector:@selector(setPreferredForwardBufferDuration:)]) {
            [_provider setPreferredForwardBufferDuration:newViewProps.preferredForwardBufferDuration];
        }
    }

    // Automatically Waits to Minimize Stalling
    if (newViewProps.automaticallyWaitsToMinimizeStalling != oldViewProps.automaticallyWaitsToMinimizeStalling) {
        if ([_provider respondsToSelector:@selector(setAutomaticallyWaitsToMinimizeStalling:)]) {
            [_provider setAutomaticallyWaitsToMinimizeStalling:newViewProps.automaticallyWaitsToMinimizeStalling];
        }
    }

    // Allows External Playback
    if (newViewProps.allowsExternalPlayback != oldViewProps.allowsExternalPlayback) {
        if ([_provider respondsToSelector:@selector(setAllowsExternalPlayback:)]) {
            [_provider setAllowsExternalPlayback:newViewProps.allowsExternalPlayback];
        }
    }

    // Prevents Display Sleep
    if (newViewProps.preventsDisplaySleepDuringVideoPlayback != oldViewProps.preventsDisplaySleepDuringVideoPlayback) {
        if ([_provider respondsToSelector:@selector(setPreventsDisplaySleepDuringVideoPlayback:)]) {
            [_provider setPreventsDisplaySleepDuringVideoPlayback:newViewProps.preventsDisplaySleepDuringVideoPlayback];
        }
    }

    // DRM Config
    if (newViewProps.drm.type != oldViewProps.drm.type ||
        newViewProps.drm.licenseServer != oldViewProps.drm.licenseServer ||
        newViewProps.drm.contentId != oldViewProps.drm.contentId ||
        newViewProps.drm.certificateUrl != oldViewProps.drm.certificateUrl) {
        [self updateDrmConfig:newViewProps.drm];
    }

    [super updateProps:props oldProps:oldProps];
}

- (void)updateSource:(const GraniteVideoViewSourceStruct &)source
{
    if (source.uri.empty()) {
        return;
    }

    GraniteVideoSource *videoSource = [[GraniteVideoSource alloc] init];
    videoSource.uri = [NSString stringWithUTF8String:source.uri.c_str()];

    if (!source.type.empty()) {
        videoSource.type = [NSString stringWithUTF8String:source.type.c_str()];
    }

    videoSource.startPosition = source.startPosition;
    videoSource.cropStart = source.cropStart;
    videoSource.cropEnd = source.cropEnd;

    [_provider loadSource:videoSource];

    if (!_paused) {
        [_provider play];
    }
}

- (void)updateResizeMode:(NSString *)mode
{
    if ([_provider respondsToSelector:@selector(setResizeMode:)]) {
        GraniteVideoResizeMode resizeMode = GraniteVideoResizeModeContain;

        if ([mode isEqualToString:@"cover"]) {
            resizeMode = GraniteVideoResizeModeCover;
        } else if ([mode isEqualToString:@"stretch"]) {
            resizeMode = GraniteVideoResizeModeStretch;
        } else if ([mode isEqualToString:@"none"]) {
            resizeMode = GraniteVideoResizeModeNone;
        }

        [_provider setResizeMode:resizeMode];
    }
}

- (void)updateDrmConfig:(const GraniteVideoViewDrmStruct &)drm
{
    if (drm.type.empty()) {
        return;
    }

    GraniteVideoDrmConfig *drmConfig = [[GraniteVideoDrmConfig alloc] init];

    // Map DRM type
    NSString *typeStr = [NSString stringWithUTF8String:drm.type.c_str()];
    if ([typeStr isEqualToString:@"fairplay"]) {
        drmConfig.type = GraniteVideoDrmTypeFairplay;
    } else if ([typeStr isEqualToString:@"widevine"]) {
        drmConfig.type = GraniteVideoDrmTypeWidevine;
    } else if ([typeStr isEqualToString:@"playready"]) {
        drmConfig.type = GraniteVideoDrmTypePlayready;
    } else if ([typeStr isEqualToString:@"clearkey"]) {
        drmConfig.type = GraniteVideoDrmTypeClearkey;
    }

    if (!drm.licenseServer.empty()) {
        drmConfig.licenseServer = [NSString stringWithUTF8String:drm.licenseServer.c_str()];
    }

    // Map JS contentId -> iOS contentID
    if (!drm.contentId.empty()) {
        drmConfig.contentID = [NSString stringWithUTF8String:drm.contentId.c_str()];
    }

    // Map JS certificateUrl -> iOS certificateURL
    if (!drm.certificateUrl.empty()) {
        drmConfig.certificateURL = [NSString stringWithUTF8String:drm.certificateUrl.c_str()];
    }

    drmConfig.base64Certificate = drm.base64Certificate;

    if ([_provider respondsToSelector:@selector(setDrmConfig:)]) {
        [_provider setDrmConfig:drmConfig];
    }
}

#pragma mark - Native Commands

- (void)seek:(double)time tolerance:(double)tolerance
{
    [_provider seekTo:time toleranceBefore:tolerance toleranceAfter:tolerance];
}

- (void)adjustVolume:(float)volume
{
    _volume = volume;
    if ([_provider respondsToSelector:@selector(setVolume:)]) {
        [_provider setVolume:volume];
    }
}

- (void)setFullScreen:(BOOL)fullscreen
{
    if ([_provider respondsToSelector:@selector(setFullscreen:animated:)]) {
        [_provider setFullscreen:fullscreen animated:YES];
    }
}

- (void)loadSource:(NSString *)uri
{
    GraniteVideoSource *source = [[GraniteVideoSource alloc] initWithUri:uri];
    [_provider loadSource:source];

    if (!_paused) {
        [_provider play];
    }
}

- (void)pause
{
    [_provider pause];
}

- (void)resume
{
    [_provider play];
}

- (void)enterPictureInPicture
{
    if ([_provider respondsToSelector:@selector(enterPictureInPicture)]) {
        [_provider enterPictureInPicture];
    }
}

- (void)exitPictureInPicture
{
    if ([_provider respondsToSelector:@selector(exitPictureInPicture)]) {
        [_provider exitPictureInPicture];
    }
}

#pragma mark - GraniteVideoDelegate

- (void)videoDidLoadStartWithIsNetwork:(BOOL)isNetwork type:(nonnull NSString *)type uri:(nonnull NSString *)uri
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoLoadStart event = {
            .isNetwork = isNetwork,
            .type = std::string([type UTF8String] ?: ""),
            .uri = std::string([uri UTF8String] ?: "")
        };
        emitter->onVideoLoadStart(event);
    }
}

- (void)videoDidLoadWithData:(nonnull GraniteVideoLoadData *)data
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoLoad event = {
            .currentTime = data.currentTime,
            .duration = data.duration,
            .naturalSize = {
                .width = data.naturalWidth,
                .height = data.naturalHeight,
                .orientation = std::string([data.orientation UTF8String] ?: "landscape")
            }
        };
        emitter->onVideoLoad(event);
    }
}

- (void)videoDidFailWithError:(nonnull GraniteVideoErrorData *)error
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoError event = {
            .error = {
                .code = (int)error.code,
                .domain = std::string([error.domain UTF8String] ?: ""),
                .localizedDescription = std::string([error.localizedDescription_ UTF8String] ?: ""),
                .localizedFailureReason = std::string([error.localizedFailureReason_ UTF8String] ?: ""),
                .localizedRecoverySuggestion = std::string([error.localizedRecoverySuggestion_ UTF8String] ?: ""),
                .errorString = std::string([error.localizedDescription_ UTF8String] ?: "")
            }
        };
        emitter->onVideoError(event);
    }
}

- (void)videoDidUpdateProgressWithData:(nonnull GraniteVideoProgressData *)data
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoProgress event = {
            .currentTime = data.currentTime,
            .playableDuration = data.playableDuration,
            .seekableDuration = data.seekableDuration
        };
        emitter->onVideoProgress(event);
    }
}

- (void)videoDidSeekWithCurrentTime:(double)currentTime seekTime:(double)seekTime
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoSeek event = {
            .currentTime = currentTime,
            .seekTime = seekTime
        };
        emitter->onVideoSeek(event);
    }
}

- (void)videoDidEnd
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoEnd({});
    }
}

- (void)videoBufferingStateChangedWithIsBuffering:(BOOL)isBuffering
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoBuffer event = {
            .isBuffering = isBuffering
        };
        emitter->onVideoBuffer(event);
    }
}

- (void)videoBandwidthDidUpdateWithBitrate:(double)bitrate width:(NSInteger)width height:(NSInteger)height
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoBandwidthUpdate event = {
            .bitrate = bitrate,
            .width = (int)width,
            .height = (int)height
        };
        emitter->onVideoBandwidthUpdate(event);
    }
}

- (void)videoPlaybackStateChangedWithIsPlaying:(BOOL)isPlaying isSeeking:(BOOL)isSeeking isLooping:(BOOL)isLooping
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoPlaybackStateChanged event = {
            .isPlaying = isPlaying,
            .isSeeking = isSeeking,
            .isLooping = isLooping
        };
        emitter->onVideoPlaybackStateChanged(event);
    }
}

- (void)videoPlaybackRateChangedWithRate:(float)rate
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoPlaybackRateChange event = {
            .playbackRate = rate
        };
        emitter->onVideoPlaybackRateChange(event);
    }
}

- (void)videoVolumeChangedWithVolume:(float)volume
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoVolumeChange event = {
            .volume = volume
        };
        emitter->onVideoVolumeChange(event);
    }
}

- (void)videoDidBecomeIdle
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoIdle({});
    }
}

- (void)videoReadyForDisplay
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoReadyForDisplay({});
    }
}

- (void)videoAudioBecomingNoisy
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoAudioBecomingNoisy({});
    }
}

- (void)videoFullscreenPlayerWillPresent
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoFullscreenPlayerWillPresent({});
    }
}

- (void)videoFullscreenPlayerDidPresent
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoFullscreenPlayerDidPresent({});
    }
}

- (void)videoFullscreenPlayerWillDismiss
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoFullscreenPlayerWillDismiss({});
    }
}

- (void)videoFullscreenPlayerDidDismiss
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoFullscreenPlayerDidDismiss({});
    }
}

- (void)videoPictureInPictureStatusChangedWithIsActive:(BOOL)isActive
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoPictureInPictureStatusChanged event = {
            .isActive = isActive
        };
        emitter->onVideoPictureInPictureStatusChanged(event);
    }
}

- (void)videoRestoreUserInterfaceForPictureInPictureStop
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        emitter->onVideoRestoreUserInterfaceForPictureInPictureStop({});
    }
}

- (void)videoControlsVisibilityChangedWithIsVisible:(BOOL)isVisible
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoControlsVisibilityChange event = {
            .isVisible = isVisible
        };
        emitter->onVideoControlsVisibilityChange(event);
    }
}

- (void)videoExternalPlaybackChangedWithIsActive:(BOOL)isActive
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoExternalPlaybackChange event = {
            .isExternalPlaybackActive = isActive
        };
        emitter->onVideoExternalPlaybackChange(event);
    }
}

- (void)videoAspectRatioChangedWithWidth:(double)width height:(double)height
{
    if (_eventEmitter) {
        auto emitter = std::static_pointer_cast<GraniteVideoViewEventEmitter const>(_eventEmitter);
        facebook::react::GraniteVideoViewEventEmitter::OnVideoAspectRatio event = {
            .width = width,
            .height = height
        };
        emitter->onVideoAspectRatio(event);
    }
}

#pragma mark - Command Handler

- (void)handleCommand:(NSString const *)commandName args:(NSArray const *)args
{
    RCTGraniteVideoViewHandleCommand(self, commandName, args);
}

#pragma mark - Cleanup

- (void)prepareForRecycle
{
    [super prepareForRecycle];
    [_provider unload];
}

- (void)dealloc
{
    [_provider unload];
    _provider = nil;
}

@end

Class<RCTComponentViewProtocol> GraniteVideoViewCls(void)
{
    return GraniteVideoView.class;
}

