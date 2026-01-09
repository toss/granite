#import <UIKit/UIKit.h>
#import <os/log.h>

#import <React/RCTViewComponentView.h>
#import <React/RCTConversions.h>
#import <react/renderer/components/GraniteImageSpec/ComponentDescriptors.h>
#import <react/renderer/components/GraniteImageSpec/EventEmitters.h>
#import <react/renderer/components/GraniteImageSpec/Props.h>
#import <react/renderer/components/GraniteImageSpec/RCTComponentViewHelpers.h>

// Import Swift module - the header is generated during build
// For CocoaPods: GraniteImage-Swift.h (based on pod name)
// For frameworks: <GraniteImage/GraniteImage-Swift.h>
#if __has_include(<GraniteImage/GraniteImage-Swift.h>)
#import <GraniteImage/GraniteImage-Swift.h>
#elif __has_include(<react_native_granite_image/react_native_granite_image-Swift.h>)
#import <react_native_granite_image/react_native_granite_image-Swift.h>
#else
// This will be found in the build directory - CocoaPods generates it there
#import "GraniteImage-Swift.h"
#endif

using namespace facebook::react;

static os_log_t graniteimage_log() {
    static os_log_t log = os_log_create("com.graniteimage", "GraniteImage");
    return log;
}

@interface GraniteImageComponentView : RCTViewComponentView <RCTGraniteImageViewProtocol>
@end

// Constructor to verify the code is being loaded
__attribute__((constructor)) static void _graniteimage_constructor(void) {
    os_log_error(graniteimage_log(), "Constructor called - class is being loaded");
}

// Force the linker to include this class
__attribute__((used)) static void _forceIncludeGraniteImageComponentView(void) {
    [GraniteImageComponentView class];
}

@implementation GraniteImageComponentView {
    UIView *_containerView;
    NSString *_currentUri;
    UIViewContentMode _currentContentMode;
    BOOL _needsInitialLoad;

    // New props
    NSDictionary<NSString *, NSString *> *_currentHeaders;
    GraniteProviderPriority _currentPriority;
    GraniteProviderCachePolicy _currentCachePolicy;
    UIColor *_currentTintColor;
    NSString *_currentDefaultSource;
    NSString *_currentFallbackSource;
}

+ (void)load
{
    NSLog(@"[GraniteImage] +load called - registering component");
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<GraniteImageComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const GraniteImageProps>();
        _props = defaultProps;
        self.clipsToBounds = YES;
        _currentContentMode = UIViewContentModeScaleAspectFill;
        _currentPriority = GraniteProviderPriorityNormal;
        _currentCachePolicy = GraniteProviderCachePolicyDisk;
        _needsInitialLoad = YES;
    }
    return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
    const auto &newViewProps = *std::static_pointer_cast<const GraniteImageProps>(props);

    // Handle uri changes
    NSString *newUri = [NSString stringWithUTF8String:newViewProps.uri.c_str()];

    // Handle headers (JSON string)
    NSDictionary<NSString *, NSString *> *newHeaders = nil;
    if (!newViewProps.headers.empty()) {
        NSString *headersJson = [NSString stringWithUTF8String:newViewProps.headers.c_str()];
        NSData *data = [headersJson dataUsingEncoding:NSUTF8StringEncoding];
        if (data) {
            newHeaders = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
        }
    }

    // Handle contentMode changes
    UIViewContentMode newContentMode = UIViewContentModeScaleAspectFill;
    switch (newViewProps.contentMode) {
        case GraniteImageContentMode::Cover:
            newContentMode = UIViewContentModeScaleAspectFill;
            break;
        case GraniteImageContentMode::Contain:
            newContentMode = UIViewContentModeScaleAspectFit;
            break;
        case GraniteImageContentMode::Stretch:
            newContentMode = UIViewContentModeScaleToFill;
            break;
        case GraniteImageContentMode::Center:
            newContentMode = UIViewContentModeCenter;
            break;
    }

    // Handle priority
    GraniteProviderPriority newPriority = GraniteProviderPriorityNormal;
    switch (newViewProps.priority) {
        case GraniteImagePriority::Low:
            newPriority = GraniteProviderPriorityLow;
            break;
        case GraniteImagePriority::Normal:
            newPriority = GraniteProviderPriorityNormal;
            break;
        case GraniteImagePriority::High:
            newPriority = GraniteProviderPriorityHigh;
            break;
    }

    // Handle cache policy
    GraniteProviderCachePolicy newCachePolicy = GraniteProviderCachePolicyDisk;
    switch (newViewProps.cachePolicy) {
        case GraniteImageCachePolicy::Memory:
            newCachePolicy = GraniteProviderCachePolicyMemory;
            break;
        case GraniteImageCachePolicy::Disk:
            newCachePolicy = GraniteProviderCachePolicyDisk;
            break;
        case GraniteImageCachePolicy::None:
            newCachePolicy = GraniteProviderCachePolicyNone;
            break;
    }

    // Handle tintColor
    UIColor *newTintColor = nil;
    if (newViewProps.tintColor) {
        newTintColor = RCTUIColorFromSharedColor(newViewProps.tintColor);
    }

    // Handle defaultSource
    NSString *newDefaultSource = nil;
    if (!newViewProps.defaultSource.empty()) {
        newDefaultSource = [NSString stringWithUTF8String:newViewProps.defaultSource.c_str()];
    }

    // Handle fallbackSource
    NSString *newFallbackSource = nil;
    if (!newViewProps.fallbackSource.empty()) {
        newFallbackSource = [NSString stringWithUTF8String:newViewProps.fallbackSource.c_str()];
    }

    BOOL shouldReload = _needsInitialLoad;
    _needsInitialLoad = NO;

    // Only URI change triggers image reload
    if (![newUri isEqualToString:_currentUri ?: @""]) {
        _currentUri = newUri;
        shouldReload = YES;
    }

    // ContentMode: update in-place without reloading
    if (newContentMode != _currentContentMode) {
        _currentContentMode = newContentMode;
        if (_containerView && [_containerView isKindOfClass:[UIImageView class]]) {
            ((UIImageView *)_containerView).contentMode = newContentMode;
        }
    }

    // TintColor: update in-place without reloading
    BOOL tintColorChanged = (newTintColor != _currentTintColor) &&
                            (newTintColor == nil || ![newTintColor isEqual:_currentTintColor]);
    if (tintColorChanged) {
        _currentTintColor = newTintColor;
        if (_containerView) {
            id<GraniteImageProvidable> provider = [[GraniteImageRegistry shared] provider];
            if (provider && [(NSObject *)provider respondsToSelector:@selector(applyTintColor:to:)]) {
                [provider applyTintColor:newTintColor to:_containerView];
            }
        }
    }

    // Update stored values (these don't require reload, they affect next load)
    _currentHeaders = newHeaders;
    _currentPriority = newPriority;
    _currentCachePolicy = newCachePolicy;
    _currentDefaultSource = newDefaultSource;
    _currentFallbackSource = newFallbackSource;

    if (shouldReload && _currentUri.length > 0) {
        [self loadImageWithProvider];
    }

    [super updateProps:props oldProps:oldProps];
}

- (void)emitOnLoadStart
{
    if (_eventEmitter) {
        std::dynamic_pointer_cast<const GraniteImageEventEmitter>(_eventEmitter)->onGraniteLoadStart({});
    }
}

- (void)emitOnProgress:(int64_t)loaded total:(int64_t)total
{
    if (_eventEmitter) {
        GraniteImageEventEmitter::OnGraniteProgress event;
        event.loaded = (int)loaded;
        event.total = (int)total;
        std::dynamic_pointer_cast<const GraniteImageEventEmitter>(_eventEmitter)->onGraniteProgress(event);
    }
}

- (void)emitOnLoad:(CGSize)imageSize
{
    if (_eventEmitter) {
        GraniteImageEventEmitter::OnGraniteLoad event;
        event.width = (int)imageSize.width;
        event.height = (int)imageSize.height;
        std::dynamic_pointer_cast<const GraniteImageEventEmitter>(_eventEmitter)->onGraniteLoad(event);
    }
}

- (void)emitOnError:(NSString *)errorMessage
{
    if (_eventEmitter) {
        GraniteImageEventEmitter::OnGraniteError event;
        event.error = std::string([errorMessage UTF8String]);
        std::dynamic_pointer_cast<const GraniteImageEventEmitter>(_eventEmitter)->onGraniteError(event);
    }
}

- (void)emitOnLoadEnd
{
    if (_eventEmitter) {
        std::dynamic_pointer_cast<const GraniteImageEventEmitter>(_eventEmitter)->onGraniteLoadEnd({});
    }
}

- (void)loadImageWithProvider
{
    // Remove existing container view
    [_containerView removeFromSuperview];
    _containerView = nil;

    id<GraniteImageProvidable> provider = [[GraniteImageRegistry shared] provider];

    if (!provider) {
        [self showErrorViewWithMessage:@"No GraniteImageProvidable registered"];
        [self emitOnError:@"No GraniteImageProvidable registered"];
        return;
    }

    if (!_currentUri || _currentUri.length == 0) {
        [self showErrorViewWithMessage:@"No URI provided"];
        [self emitOnError:@"No URI provided"];
        return;
    }

    // Emit load start event
    [self emitOnLoadStart];

    // Create new image view from provider
    UIView *imageView = [provider createImageView];
    imageView.frame = self.bounds;
    imageView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self addSubview:imageView];
    _containerView = imageView;

    // Check if provider supports extended loading with callbacks
    __weak GraniteImageComponentView *weakSelf = self;
    if ([(NSObject *)provider respondsToSelector:@selector(loadImageWithURL:into:contentMode:headers:priority:cachePolicy:defaultSource:progress:completion:)]) {
        [provider loadImageWithURL:_currentUri
                              into:imageView
                       contentMode:_currentContentMode
                           headers:_currentHeaders
                          priority:_currentPriority
                       cachePolicy:_currentCachePolicy
                     defaultSource:_currentDefaultSource
                          progress:^(int64_t loaded, int64_t total) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [weakSelf emitOnProgress:loaded total:total];
            });
        }
                        completion:^(UIImage *image, NSError *error, CGSize imageSize) {
            dispatch_async(dispatch_get_main_queue(), ^{
                GraniteImageComponentView *strongSelf = weakSelf;
                if (!strongSelf) return;

                if (error) {
                    [strongSelf emitOnError:error.localizedDescription];

                    // Load fallback image if available
                    if (strongSelf->_currentFallbackSource.length > 0) {
                        [provider loadImageWithURL:strongSelf->_currentFallbackSource
                                              into:imageView
                                       contentMode:strongSelf->_currentContentMode
                                           headers:nil
                                          priority:GraniteProviderPriorityHigh
                                       cachePolicy:GraniteProviderCachePolicyDisk
                                     defaultSource:nil
                                          progress:nil
                                        completion:nil];
                    }
                } else {
                    [strongSelf emitOnLoad:imageSize];
                }
                [strongSelf emitOnLoadEnd];

                // Apply tint color if set
                if (strongSelf->_currentTintColor && [(NSObject *)provider respondsToSelector:@selector(applyTintColor:to:)]) {
                    [provider applyTintColor:strongSelf->_currentTintColor to:imageView];
                }
            });
        }];
    } else {
        // Fall back to simple loading
        [provider loadImageWithURL:_currentUri into:imageView contentMode:_currentContentMode];

        // For simple providers, emit load success after a short delay (since we don't know when it finishes)
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            GraniteImageComponentView *strongSelf = weakSelf;
            if (strongSelf) {
                // We don't have real image size, so use view bounds
                [strongSelf emitOnLoad:strongSelf.bounds.size];
                [strongSelf emitOnLoadEnd];
            }
        });
    }
}

- (void)showErrorViewWithMessage:(NSString *)message
{
    UIView *errorView = [[UIView alloc] initWithFrame:self.bounds];
    errorView.backgroundColor = [UIColor redColor];
    errorView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

    UILabel *label = [[UILabel alloc] init];
    label.text = message;
    label.textColor = [UIColor whiteColor];
    label.textAlignment = NSTextAlignmentCenter;
    label.font = [UIFont systemFontOfSize:12];
    label.numberOfLines = 0;
    label.translatesAutoresizingMaskIntoConstraints = NO;

    [errorView addSubview:label];
    [NSLayoutConstraint activateConstraints:@[
        [label.centerXAnchor constraintEqualToAnchor:errorView.centerXAnchor],
        [label.centerYAnchor constraintEqualToAnchor:errorView.centerYAnchor],
        [label.leadingAnchor constraintGreaterThanOrEqualToAnchor:errorView.leadingAnchor constant:8],
        [label.trailingAnchor constraintLessThanOrEqualToAnchor:errorView.trailingAnchor constant:-8]
    ]];

    [self addSubview:errorView];
    _containerView = errorView;
}

- (void)prepareForRecycle
{
    [super prepareForRecycle];

    id<GraniteImageProvidable> provider = [[GraniteImageRegistry shared] provider];
    if (_containerView && provider) {
        [provider cancelLoadWith:_containerView];
    }

    [_containerView removeFromSuperview];
    _containerView = nil;
    _currentUri = nil;
}

@end
