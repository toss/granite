#import "RNComponentView.h"

#import <GraniteMicroFrontendRuntime/PortalHostContainerView.h>

/// The Portal lays content out only in a host whose width and height are both non-zero, so a content-sized view needs
/// a non-zero size before its first measurement.
static const CGSize RNComponentViewPlaceholderSize = {48, 48};

typedef NS_ENUM(NSInteger, RNComponentViewSessionState) {
  /// The view has not moved to a window yet.
  RNComponentViewSessionStateNotOpened,
  /// The session closes when the view is deallocated.
  RNComponentViewSessionStateOpened,
  /// The delegate declined to open the session. The view stays empty.
  RNComponentViewSessionStateDeclined,
  /// The session id was already registered. The view stays empty.
  RNComponentViewSessionStateRegistrationFailed,
};

@implementation RNComponentView {
  NSDictionary<NSString *, id> *_props;
  NSString *_bundleFilePath;
  PortalHostContainerView *_portalHostView;
  RNComponentSessionRegistration *_registration;
  RNComponentViewSessionState _sessionState;
}

+ (CGSize)placeholderSize
{
  return RNComponentViewPlaceholderSize;
}

- (instancetype)initWithComponentName:(NSString *)componentName
                                props:(NSDictionary<NSString *, id> *)props
                               sizing:(RNComponentViewSizing)sizing
                       bundleFilePath:(nullable NSString *)bundleFilePath
{
  return [self initWithComponentName:componentName
                               props:props
                              sizing:sizing
                      bundleFilePath:bundleFilePath
                  deferredActivation:NO];
}

- (instancetype)initWithComponentName:(NSString *)componentName
                                props:(NSDictionary<NSString *, id> *)props
                               sizing:(RNComponentViewSizing)sizing
                       bundleFilePath:(nullable NSString *)bundleFilePath
                   deferredActivation:(BOOL)deferredActivation
{
  if (self = [super initWithFrame:CGRectZero]) {
    _componentName = [componentName copy];
    _sessionId = NSUUID.UUID.UUIDString;
    _sizing = sizing;
    _props = [props copy];
    _bundleFilePath = [bundleFilePath copy];
    _sessionState = RNComponentViewSessionStateNotOpened;
    self.clipsToBounds = YES;

    _portalHostView = [[PortalHostContainerView alloc] initWithFrame:self.bounds
                                                  deferredActivation:deferredActivation];
    _portalHostView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    // The renderer names the Portal host after the session id.
    [_portalHostView setName:_sessionId];
    __weak RNComponentView *weakSelf = self;
    _portalHostView.onContentDidAttach = ^{
      [weakSelf updateContentVisibility];
    };
    _portalHostView.onContentDidDetach = ^{
      [weakSelf updateContentVisibility];
    };
    [self addSubview:_portalHostView];

    _placeholderView = [[UIView alloc] initWithFrame:self.bounds];
    _placeholderView.backgroundColor = UIColor.secondarySystemBackgroundColor;
    _placeholderView.userInteractionEnabled = NO;
    _placeholderView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self addSubview:_placeholderView];
  }
  return self;
}

- (void)dealloc
{
  // The Portal host unregisters its name when it is deallocated.
  [_registration invalidate];
}

- (CGSize)intrinsicContentSize
{
  BOOL isEmpty = [self isEmpty];
  switch (_sizing) {
    case RNComponentViewSizingContentHeight: {
      CGFloat height = _hasContentSize ? _contentSize.height : RNComponentViewPlaceholderSize.height;
      return CGSizeMake(UIViewNoIntrinsicMetric, isEmpty ? 0 : height);
    }
    case RNComponentViewSizingContentSize:
      if (isEmpty) {
        return CGSizeZero;
      }
      return _hasContentSize ? _contentSize : RNComponentViewPlaceholderSize;
    case RNComponentViewSizingConstrained:
      return CGSizeMake(UIViewNoIntrinsicMetric, UIViewNoIntrinsicMetric);
  }
  return CGSizeMake(UIViewNoIntrinsicMetric, UIViewNoIntrinsicMetric);
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window == nil) {
    return;
  }
  [self openSessionIfNeeded];
}

- (void)setUnavailable:(BOOL)unavailable
{
  if (_unavailable == unavailable) {
    return;
  }
  _unavailable = unavailable;
  [self updateContentVisibility];
  [self invalidateIntrinsicContentSize];
}

- (void)updateProps:(NSDictionary<NSString *, id> *)props
{
  _props = [props copy];
  [_registration updateProps:_props];
}

- (void)activateIfNeeded
{
  [_portalHostView activateIfNeeded];
}

#pragma mark - Private

- (BOOL)isEmpty
{
  switch (_sessionState) {
    case RNComponentViewSessionStateNotOpened:
    case RNComponentViewSessionStateOpened:
      return _unavailable;
    case RNComponentViewSessionStateDeclined:
    case RNComponentViewSessionStateRegistrationFailed:
      return YES;
  }
  return YES;
}

- (void)openSessionIfNeeded
{
  if (_sessionState != RNComponentViewSessionStateNotOpened) {
    return;
  }

  id<RNComponentViewDelegate> delegate = self.delegate;
  if ([delegate respondsToSelector:@selector(componentViewShouldOpenSession:)] &&
      ![delegate componentViewShouldOpenSession:self]) {
    [self leaveEmptyWithSessionState:RNComponentViewSessionStateDeclined];
    return;
  }

  RNComponentSessionRegistration *registration = [RNComponentSessions registerSession:_sessionId];
  if (registration == nil) {
    [self leaveEmptyWithSessionState:RNComponentViewSessionStateRegistrationFailed];
    return;
  }

  _registration = registration;
  _sessionState = RNComponentViewSessionStateOpened;
  __weak RNComponentView *weakSelf = self;
  registration.contentSizeHandler = ^(CGSize contentSize) {
    [weakSelf contentSizeDidChange:contentSize];
  };
  [registration openComponentWithName:_componentName props:_props sizing:_sizing bundleFilePath:_bundleFilePath];

  if ([delegate respondsToSelector:@selector(componentViewDidOpenSession:)]) {
    [delegate componentViewDidOpenSession:self];
  }
  [self updateContentVisibility];
}

- (void)leaveEmptyWithSessionState:(RNComponentViewSessionState)sessionState
{
  _sessionState = sessionState;
  [self updateContentVisibility];
  [self invalidateIntrinsicContentSize];
}

- (void)contentSizeDidChange:(CGSize)contentSize
{
  if (_hasContentSize && CGSizeEqualToSize(_contentSize, contentSize)) {
    return;
  }
  _hasContentSize = YES;
  _contentSize = contentSize;
  [self updateContentVisibility];

  switch (_sizing) {
    case RNComponentViewSizingContentHeight:
    case RNComponentViewSizingContentSize: {
      [self invalidateIntrinsicContentSize];
      id<RNComponentViewDelegate> delegate = self.delegate;
      if ([delegate respondsToSelector:@selector(componentView:didChangeContentSize:)]) {
        [delegate componentView:self didChangeContentSize:contentSize];
      }
      break;
    }
    case RNComponentViewSizingConstrained:
      break;
  }
}

- (void)updateContentVisibility
{
  BOOL isEmpty = [self isEmpty];
  // Content-sized content is ready once the renderer has measured it.
  BOOL isContentReady = _portalHostView.hasAttachedContent &&
      (_sizing == RNComponentViewSizingConstrained || _hasContentSize);
  _portalHostView.hidden = isEmpty;
  _placeholderView.hidden = isEmpty || isContentReady;
}

@end
