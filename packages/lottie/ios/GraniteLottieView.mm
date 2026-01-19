#import <React/RCTViewComponentView.h>
#import <React/RCTConversions.h>

#import <react/renderer/components/GraniteLottieViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/GraniteLottieViewSpec/EventEmitters.h>
#import <react/renderer/components/GraniteLottieViewSpec/Props.h>
#import <react/renderer/components/GraniteLottieViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

// Import Swift header
#if __has_include(<GraniteLottie/GraniteLottie-Swift.h>)
#import <GraniteLottie/GraniteLottie-Swift.h>
#elif __has_include(<react_native_granite_lottie/react_native_granite_lottie-Swift.h>)
#import <react_native_granite_lottie/react_native_granite_lottie-Swift.h>
#else
#import "GraniteLottie-Swift.h"
#endif

using namespace facebook::react;

// Redefine GraniteLottieView to inherit from RCTViewComponentView
@interface GraniteLottieView : RCTViewComponentView <RCTGraniteLottieViewViewProtocol, GraniteLottieDelegate>
@end

@implementation GraniteLottieView {
    UIView *_containerView;
    id<GraniteLottieProvidable> _provider;
    GraniteLottieLoadConfig *_config;

    // Current source state
    NSString *_currentSourceName;
    NSString *_currentSourceJson;
    NSString *_currentSourceURL;
    NSString *_currentDotLottieURI;

    // Current animation state
    BOOL _shouldAutoPlay;
    BOOL _isLoaded;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<GraniteLottieViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const GraniteLottieViewProps>();
        _props = defaultProps;

        _config = [[GraniteLottieLoadConfig alloc] init];
        _isLoaded = NO;
        _shouldAutoPlay = NO;

        // Get provider from registry
        _provider = [GraniteLottieRegistry shared].provider;

#if GRANITE_LOTTIE_DEFAULT_PROVIDER
        // Fallback to built-in provider when default provider is enabled
        if (!_provider) {
            _provider = [[BuiltInLottieProvider alloc] init];
        }
#else
        // When default provider is disabled, require explicit provider registration
        if (!_provider) {
            NSLog(@"[GraniteLottie] Warning: No provider registered. Register a provider using GraniteLottieRegistry.");
            return self;
        }
#endif

        // Create container view from provider
        _containerView = [_provider createAnimationView];
        _containerView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        _containerView.frame = self.bounds;

        // Set delegate
        [_provider setDelegate:self for:_containerView];

        self.contentView = _containerView;
    }
    return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<GraniteLottieViewProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<GraniteLottieViewProps const>(props);

    BOOL shouldReload = NO;

    // Source properties - trigger reload
    NSString *newSourceName = [[NSString alloc] initWithUTF8String:newViewProps.sourceName.c_str()];
    NSString *newSourceJson = [[NSString alloc] initWithUTF8String:newViewProps.sourceJson.c_str()];
    NSString *newSourceURL = [[NSString alloc] initWithUTF8String:newViewProps.sourceURL.c_str()];
    NSString *newDotLottieURI = [[NSString alloc] initWithUTF8String:newViewProps.sourceDotLottieURI.c_str()];

    if (![newSourceName isEqualToString:_currentSourceName ?: @""] && newSourceName.length > 0) {
        _currentSourceName = newSourceName;
        _currentSourceJson = nil;
        _currentSourceURL = nil;
        _currentDotLottieURI = nil;
        shouldReload = YES;
    }

    if (![newSourceJson isEqualToString:_currentSourceJson ?: @""] && newSourceJson.length > 0) {
        _currentSourceJson = newSourceJson;
        _currentSourceName = nil;
        _currentSourceURL = nil;
        _currentDotLottieURI = nil;
        shouldReload = YES;
    }

    if (![newSourceURL isEqualToString:_currentSourceURL ?: @""] && newSourceURL.length > 0) {
        _currentSourceURL = newSourceURL;
        _currentSourceName = nil;
        _currentSourceJson = nil;
        _currentDotLottieURI = nil;
        shouldReload = YES;
    }

    if (![newDotLottieURI isEqualToString:_currentDotLottieURI ?: @""] && newDotLottieURI.length > 0) {
        _currentDotLottieURI = newDotLottieURI;
        _currentSourceName = nil;
        _currentSourceJson = nil;
        _currentSourceURL = nil;
        shouldReload = YES;
    }

    // Animation control properties - in-place update
    if (oldViewProps.speed != newViewProps.speed) {
        _config.speed = newViewProps.speed;
        if (_isLoaded) {
            [_provider setSpeed:newViewProps.speed for:_containerView];
        }
    }

    if (oldViewProps.loop != newViewProps.loop) {
        _config.loop = newViewProps.loop;
        if (_isLoaded) {
            [_provider setLoop:newViewProps.loop for:_containerView];
        }
    }

    _shouldAutoPlay = newViewProps.autoPlay;
    _config.autoPlay = newViewProps.autoPlay;
    if (_isLoaded && _shouldAutoPlay && !shouldReload) {
        [_provider playWithView:_containerView startFrame:-1 endFrame:-1];
    }

    if (oldViewProps.progress != newViewProps.progress) {
        _config.progress = newViewProps.progress;
        if (_isLoaded) {
            [_provider setProgress:newViewProps.progress for:_containerView];
        }
    }

    // Resize mode - in-place update
    NSString *newResizeMode = [[NSString alloc] initWithUTF8String:newViewProps.resizeMode.c_str()];
    if (newResizeMode.length > 0) {
        _config.resizeMode = [GraniteLottieResizeModeHelper fromString:newResizeMode];
    }

    // Cache composition
    _config.cacheComposition = newViewProps.cacheComposition;

    // Color filters
    if (newViewProps.colorFilters.size() > 0) {
        NSMutableArray<GraniteLottieColorFilter *> *filters = [NSMutableArray array];
        for (const auto &filter : newViewProps.colorFilters) {
            NSString *keypath = [[NSString alloc] initWithUTF8String:filter.keypath.c_str()];
            NSString *colorStr = [[NSString alloc] initWithUTF8String:filter.color.c_str()];
            UIColor *color = [self colorFromHexString:colorStr];
            if (color) {
                [filters addObject:[[GraniteLottieColorFilter alloc] initWithKeypath:keypath color:color]];
            }
        }
        _config.colorFilters = filters;

        if (_isLoaded && [_provider respondsToSelector:@selector(applyColorFilters:to:)]) {
            [_provider applyColorFilters:filters to:_containerView];
        }
    }

    // Text filters (iOS)
    if (newViewProps.textFiltersIOS.size() > 0) {
        NSMutableArray<GraniteLottieTextFilter *> *filters = [NSMutableArray array];
        for (const auto &filter : newViewProps.textFiltersIOS) {
            NSString *keypath = [[NSString alloc] initWithUTF8String:filter.keypath.c_str()];
            NSString *text = [[NSString alloc] initWithUTF8String:filter.text.c_str()];
            [filters addObject:[[GraniteLottieTextFilter alloc] initWithKeypath:keypath text:text]];
        }
        _config.textFilters = filters;

        if (_isLoaded && [_provider respondsToSelector:@selector(applyTextFilters:to:)]) {
            [_provider applyTextFilters:filters to:_containerView];
        }
    }

    // Load animation if source changed
    if (shouldReload) {
        [self loadAnimation];
    }

    [super updateProps:props oldProps:oldProps];
}

- (void)loadAnimation
{
    _isLoaded = NO;

    if (_currentSourceName.length > 0) {
        [_provider loadAnimationWithNamed:_currentSourceName into:_containerView config:_config];
    } else if (_currentSourceJson.length > 0) {
        [_provider loadAnimationWithJson:_currentSourceJson into:_containerView config:_config];
    } else if (_currentSourceURL.length > 0) {
        NSURL *url = [NSURL URLWithString:_currentSourceURL];
        if (url) {
            [_provider loadAnimationWithUrl:url into:_containerView config:_config];
        }
    } else if (_currentDotLottieURI.length > 0) {
        [_provider loadDotLottieWithUri:_currentDotLottieURI into:_containerView config:_config];
    }
}

#pragma mark - Commands

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
    RCTGraniteLottieViewHandleCommand(self, commandName, args);
}

- (void)play:(NSInteger)startFrame endFrame:(NSInteger)endFrame
{
    [_provider playWithView:_containerView startFrame:(int)startFrame endFrame:(int)endFrame];
}

- (void)pause
{
    [_provider pauseWithView:_containerView];
}

- (void)resume
{
    [_provider resumeWithView:_containerView];
}

- (void)reset
{
    [_provider resetWithView:_containerView];
}

#pragma mark - GraniteLottieDelegate

- (void)animationDidLoad
{
    _isLoaded = YES;

    if (_eventEmitter) {
        std::dynamic_pointer_cast<const GraniteLottieViewEventEmitter>(_eventEmitter)
            ->onAnimationLoaded(GraniteLottieViewEventEmitter::OnAnimationLoaded{});
    }

    if (_shouldAutoPlay) {
        [_provider playWithView:_containerView startFrame:-1 endFrame:-1];
    }
}

- (void)animationDidFinishWithIsCancelled:(BOOL)isCancelled
{
    if (_eventEmitter) {
        std::dynamic_pointer_cast<const GraniteLottieViewEventEmitter>(_eventEmitter)
            ->onAnimationFinish(GraniteLottieViewEventEmitter::OnAnimationFinish{
                .isCancelled = isCancelled
            });
    }
}

- (void)animationDidFailWithError:(NSString *)error
{
    if (_eventEmitter) {
        std::dynamic_pointer_cast<const GraniteLottieViewEventEmitter>(_eventEmitter)
            ->onAnimationFailure(GraniteLottieViewEventEmitter::OnAnimationFailure{
                .error = std::string([error UTF8String])
            });
    }
}

- (void)animationDidLoop
{
    if (_eventEmitter) {
        std::dynamic_pointer_cast<const GraniteLottieViewEventEmitter>(_eventEmitter)
            ->onAnimationLoop(GraniteLottieViewEventEmitter::OnAnimationLoop{});
    }
}

#pragma mark - Helpers

- (UIColor *)colorFromHexString:(NSString *)hexString
{
    if (!hexString || hexString.length == 0) return nil;

    NSString *cleanString = [hexString stringByReplacingOccurrencesOfString:@"#" withString:@""];

    if (cleanString.length == 6) {
        unsigned int rgbValue;
        NSScanner *scanner = [NSScanner scannerWithString:cleanString];
        [scanner scanHexInt:&rgbValue];

        return [UIColor colorWithRed:((rgbValue & 0xFF0000) >> 16) / 255.0
                               green:((rgbValue & 0x00FF00) >> 8) / 255.0
                                blue:(rgbValue & 0x0000FF) / 255.0
                               alpha:1.0];
    }

    return nil;
}

@end

Class<RCTComponentViewProtocol> GraniteLottieViewCls(void)
{
    return GraniteLottieView.class;
}
