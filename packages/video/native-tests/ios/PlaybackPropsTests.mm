#import <XCTest/XCTest.h>
#import <AVKit/AVKit.h>
#import <React/RCTViewComponentView.h>
#import <GraniteVideo/GraniteVideo-Swift.h>
#import <react/renderer/components/GraniteVideoViewSpec/Props.h>

using namespace facebook::react;

@interface MinimalVideoProvider : NSObject <GraniteVideoProvidable>
@property(nonatomic, weak) id<GraniteVideoDelegate> delegate;
@property(nonatomic) double currentTime;
@property(nonatomic) double duration;
@property(nonatomic) BOOL isPlaying;
@property(nonatomic, strong) NSMutableArray<NSString *> *calls;
@end
@implementation MinimalVideoProvider
- (instancetype)init { if (self = [super init]) { _calls = [NSMutableArray new]; } return self; }
- (UIView *)createPlayerView { return [UIView new]; }
- (void)loadSource:(GraniteVideoSource *)source { [_calls addObject:@"load"]; }
- (void)unload { [_calls addObject:@"unload"]; }
- (void)play {}
- (void)pause {}
- (void)seekTo:(double)time toleranceBefore:(double)before toleranceAfter:(double)after {}
@end

@interface RecordingVideoProvider : MinimalVideoProvider
@end
@implementation RecordingVideoProvider
- (void)setProgressUpdateInterval:(double)value { [self.calls addObject:[NSString stringWithFormat:@"progress:%.0f", value]]; }
- (void)setMixWithOthers:(GraniteVideoMixWithOthers)value { [self.calls addObject:[NSString stringWithFormat:@"mix:%ld", (long)value]]; }
- (void)setAutomaticallyWaitsToMinimizeStalling:(BOOL)value { [self.calls addObject:value ? @"wait:YES" : @"wait:NO"]; }
@end

@interface PlaybackPropsTests : XCTestCase
@end
@implementation PlaybackPropsTests
- (RCTViewComponentView *)viewWithProvider:(MinimalVideoProvider *)provider {
    [[GraniteVideoRegistry shared] registerWithFactory:^id<GraniteVideoProvidable> { return provider; }];
    return [(RCTViewComponentView *)[NSClassFromString(@"GraniteVideoView") alloc] initWithFrame:CGRectZero];
}
- (void)testOptionsAreAppliedBeforeTheFirstSource {
    RecordingVideoProvider *provider = [RecordingVideoProvider new];
    RCTViewComponentView *view = [self viewWithProvider:provider];
    auto props = std::make_shared<GraniteVideoViewProps>();
    props->source.uri = "file:///video.mp4";
    props->progressUpdateInterval = 125;
    props->mixWithOthers = "duck";
    props->automaticallyWaitsToMinimizeStalling = true;
    [view updateProps:props oldProps:std::make_shared<GraniteVideoViewProps>()];
    XCTAssertEqualObjects(provider.calls, (@[@"mix:2", @"progress:125", @"wait:YES", @"load"]));
    [provider.calls removeAllObjects];
    [view updateProps:props oldProps:props];
    XCTAssertEqual(provider.calls.count, 0u);
}
- (void)testFreshDefaultsDoNotChangeTheAudioSession {
    RecordingVideoProvider *provider = [RecordingVideoProvider new];
    RCTViewComponentView *view = [self viewWithProvider:provider];
    auto props = std::make_shared<GraniteVideoViewProps>();
    props->source.uri = "file:///video.mp4";
    [view updateProps:props oldProps:std::make_shared<GraniteVideoViewProps>()];
    XCTAssertEqualObjects(provider.calls, (@[@"progress:0", @"wait:NO", @"load"]));
}
- (void)testRecyclingRestoresDefaultsBeforeReloadingTheSameSource {
    RecordingVideoProvider *provider = [RecordingVideoProvider new];
    RCTViewComponentView *view = [self viewWithProvider:provider];
    auto props = std::make_shared<GraniteVideoViewProps>();
    props->source.uri = "file:///video.mp4";
    props->progressUpdateInterval = 500;
    props->mixWithOthers = "mix";
    props->automaticallyWaitsToMinimizeStalling = true;
    [view updateProps:props oldProps:std::make_shared<GraniteVideoViewProps>()];
    [provider.calls removeAllObjects];
    [view prepareForRecycle];
    auto defaults = std::make_shared<GraniteVideoViewProps>();
    defaults->source.uri = props->source.uri;
    [view updateProps:defaults oldProps:std::make_shared<GraniteVideoViewProps>()];
    XCTAssertEqualObjects(provider.calls, (@[@"unload", @"mix:0", @"progress:0", @"wait:NO", @"load"]));
}
- (void)testProvidersWithoutOptionalPlaybackMethodsCanLoad {
    MinimalVideoProvider *provider = [MinimalVideoProvider new];
    RCTViewComponentView *view = [self viewWithProvider:provider];
    auto props = std::make_shared<GraniteVideoViewProps>();
    props->source.uri = "file:///video.mp4";
    props->mixWithOthers = "mix";
    props->progressUpdateInterval = 100;
    [view updateProps:props oldProps:std::make_shared<GraniteVideoViewProps>()];
    XCTAssertEqualObjects(provider.calls, (@[@"load"]));
}
@end
