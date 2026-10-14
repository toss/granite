#import "PortalHostContainerView.h"

#import <QuartzCore/QuartzCore.h>
#import <React/RCTRootComponentView.h>
#import <React/RCTSurfaceTouchHandler.h>
#import "PortalHostView.h"

@interface GranitePortalSurfaceTouchHandler : RCTSurfaceTouchHandler
@end

static BOOL GraniteIsSurfaceTouchHandler(UIGestureRecognizer *recognizer)
{
  return [recognizer isKindOfClass:[RCTSurfaceTouchHandler class]];
}

static BOOL GraniteIsPortalSurfaceTouchHandler(UIGestureRecognizer *recognizer)
{
  return [recognizer isKindOfClass:[GranitePortalSurfaceTouchHandler class]];
}

/// What a single view contributes to touch ownership. A view installs at most
/// one meaningful Fabric touch root: none, a Portal one, or a foreign one that
/// belongs to a plain React Native root and outranks any Portal handler.
typedef NS_ENUM(NSUInteger, GraniteTouchRootKind) {
  GraniteTouchRootKindNone = 0,
  GraniteTouchRootKindPortal,
  GraniteTouchRootKindForeign,
};

/// Classifies the Fabric touch root installed on a single view of the touch path.
///
/// Takes `view.gestureRecognizers` and ignores everything that is not an enabled
/// `RCTSurfaceTouchHandler`: disabled handlers never dispatch, and unrelated
/// recognizers (scroll, pan, and friends) do not own Fabric touch dispatch.
///
/// A foreign handler wins over a Portal handler on the same view. A screen mounted
/// outside a React root can install its own handler beneath the Portal container,
/// and yielding to it is what stops both handlers from forwarding the same tap.
///
/// On `GraniteTouchRootKindPortal` the first matching handler is written to
/// `outHandler`, which is left untouched for the other kinds.
static GraniteTouchRootKind GraniteTouchRootOnView(
    UIView *view,
    GranitePortalSurfaceTouchHandler *__strong *outHandler)
{
  __block GraniteTouchRootKind kind = GraniteTouchRootKindNone;
  __block GranitePortalSurfaceTouchHandler *portalHandler = nil;

  [view.gestureRecognizers enumerateObjectsUsingBlock:^(
                               UIGestureRecognizer *recognizer,
                               __unused NSUInteger index,
                               BOOL *stop) {
    if (!recognizer.isEnabled || !GraniteIsSurfaceTouchHandler(recognizer)) {
      return;
    }
    if (!GraniteIsPortalSurfaceTouchHandler(recognizer)) {
      kind = GraniteTouchRootKindForeign;
      *stop = YES;
      return;
    }
    if (kind == GraniteTouchRootKindNone) {
      kind = GraniteTouchRootKindPortal;
      portalHandler = (GranitePortalSurfaceTouchHandler *)recognizer;
    }
  }];

  if (kind == GraniteTouchRootKindPortal) {
    *outHandler = portalHandler;
  }

  return kind;
}

/// Walks the touch path upwards from `view` and reports whether it stays Portal-owned.
///
/// Recurses through `view.superview`, classifying each view with
/// `GraniteTouchRootOnView`. Returns NO as soon as a foreign React Native root
/// claims the path, and YES once the walk runs past the top without meeting one.
///
/// `outOwningPortalHandler` receives the Portal handler whose container hosts the
/// touched view. It accumulates across the recursion and must start as nil: the
/// walk runs bottom-up, so the first Portal handler met is the hosting one.
static BOOL GranitePortalOwnsTouchPath(
    UIView *view,
    GranitePortalSurfaceTouchHandler *__strong *outOwningPortalHandler)
{
  if (view == nil) {
    return YES;
  }

  GranitePortalSurfaceTouchHandler *handlerOnView = nil;

  switch (GraniteTouchRootOnView(view, &handlerOnView)) {
    case GraniteTouchRootKindForeign:
      // A React Native root owns this touch path; let it dispatch alone.
      return NO;
    case GraniteTouchRootKindPortal:
      if (*outOwningPortalHandler == nil) {
        *outOwningPortalHandler = handlerOnView;
      }
      break;
    case GraniteTouchRootKindNone:
      break;
  }

  return GranitePortalOwnsTouchPath(view.superview, outOwningPortalHandler);
}

/// Decides whether `touchHandler` is the single handler allowed to dispatch `touch`.
///
/// Takes the handler's own view and the touched view, then hands the actual touch
/// path — the touched view up through its superviews — to `GranitePortalOwnsTouchPath`.
/// The handler dispatches only when it is the Portal handler owning that path.
///
/// Why this leaves exactly one handler, however many Portals exist:
///
/// Sibling Portals never see each other's touches.
///
///     screen
///      ├ portalA  <- handlerA
///      │   └ leafA
///      └ portalB  <- handlerB
///          └ leafB
///
/// UIKit only asks `shouldReceiveTouch:` of recognizers on the touched view and its
/// ancestors, so handlerB is never asked about `leafA`. Even if it were, the
/// `isDescendantOfView:` guard below rejects a touch outside the handler's own subtree.
///
/// Nested Portals are all asked, and all resolve to the same owner.
///
///     portalA  <- handlerA
///      └ portalB  <- handlerB
///         └ portalC  <- handlerC
///            └ leaf
///
/// A, B and C are all ancestors of `leaf`, so UIKit asks all three. Each one walks
/// the same path from `leaf` upwards, and the walk direction is fixed, so each one
/// meets C first. `owningPortalHandler == touchHandler` therefore holds for C alone;
/// A and B yield. Any nesting depth leaves exactly one handler.
///
/// C is also the right owner, not merely the unique one. Portal content is always
/// mounted inside its own container's subtree, so the first container met is the one
/// whose surface rendered `leaf`. Fabric resolves the event receiver from the touched
/// component view regardless of which handler fires, but it computes page coordinates
/// relative to the firing handler's view — and `leaf` belongs to C's coordinate space.
///
/// Plain hosted content installs no touch root of its own and so resolves to the
/// container hosting it.
static BOOL GranitePortalSurfaceTouchHandlerShouldReceiveTouch(
    GranitePortalSurfaceTouchHandler *touchHandler,
    UITouch *touch)
{
  UIView *handlerView = touchHandler.view;
  UIView *touchView = touch.view;

  // A touch that never entered this container is none of its business.
  if (handlerView == nil || touchView == nil || ![touchView isDescendantOfView:handlerView]) {
    return NO;
  }

  GranitePortalSurfaceTouchHandler *owningPortalHandler = nil;
  if (!GranitePortalOwnsTouchPath(touchView, &owningPortalHandler)) {
    return NO;
  }

  // No Portal handler on the path means this one detached mid-touch: stay
  // permissive rather than dropping the touch entirely.
  return owningPortalHandler == nil || owningPortalHandler == touchHandler;
}

@implementation GranitePortalSurfaceTouchHandler

- (BOOL)gestureRecognizer:(__unused UIGestureRecognizer *)gestureRecognizer shouldReceiveTouch:(UITouch *)touch
{
  return GranitePortalSurfaceTouchHandlerShouldReceiveTouch(self, touch);
}

@end

@class GranitePortalContentLayoutObservation;

@interface PortalHostContainerView ()
- (UIView *)portalContentLayoutHost;
- (void)removeContentLayoutObservation:(GranitePortalContentLayoutObservation *)observation;
@end

@interface GranitePortalContentLayoutTickTarget : NSObject
@property (nonatomic, weak) GranitePortalContentLayoutObservation *observation;
- (void)tick:(CADisplayLink *)link;
@end

@interface GranitePortalContentLayoutObservation : NSObject <PortalContentLayoutObservation>
- (instancetype)initWithOwner:(PortalHostContainerView *)owner
                     nativeId:(NSString *)nativeId
                      onReady:(void (^)(void))onReady;
- (void)startIfNeeded;
- (void)checkContentLayout;
@end

static UIView *GraniteFindInitialContentMarker(UIView *host, NSString *nativeId)
{
  UIView *match = nil;
  NSMutableArray<UIView *> *pending = [NSMutableArray arrayWithObject:host];
  while (pending.count > 0) {
    UIView *parent = pending.lastObject;
    [pending removeLastObject];
    for (UIView *child in parent.subviews) {
      if (child.superview != parent) continue;
      if ([child isKindOfClass:[RCTViewComponentView class]] &&
          [((RCTViewComponentView *)child).nativeId isEqualToString:nativeId]) {
        if (match != nil) return nil;
        match = child;
      }
      [pending addObject:child];
    }
  }
  return match;
}

static BOOL GraniteHasNativeInitialContent(UIView *marker, UIWindow *window)
{
  BOOL hasContent = NO;
  NSMutableArray<UIView *> *pending = [NSMutableArray arrayWithObject:marker];
  while (pending.count > 0) {
    UIView *parent = pending.lastObject;
    [pending removeLastObject];
    for (UIView *child in parent.subviews) {
      if (child.superview != parent || child.hidden || !(child.alpha > 0)) continue;
      if (child.window != window || child.layer.needsLayout) return NO;
      if (child.bounds.size.width <= 0 || child.bounds.size.height <= 0) continue;
      hasContent = YES;
      [pending addObject:child];
    }
  }
  return hasContent;
}

static BOOL GraniteHasInitialContentLayout(
    UIView *marker, UIView *host, PortalHostContainerView *container)
{
  UIWindow *window = container.window;
  if (window == nil || host.bounds.size.width <= 0 || host.bounds.size.height <= 0 ||
      marker.bounds.size.width <= 0 || marker.bounds.size.height <= 0) {
    return NO;
  }
  for (UIView *view = marker; view != nil; view = view.superview) {
    if (view.window != window || view.hidden || !(view.alpha > 0) || view.layer.needsLayout ||
        view.bounds.size.width <= 0 || view.bounds.size.height <= 0) return NO;
    if (view == container) return GraniteHasNativeInitialContent(marker, window);
  }
  return NO;
}

@implementation GranitePortalContentLayoutTickTarget
- (void)tick:(CADisplayLink *)link
{
  GranitePortalContentLayoutObservation *observation = self.observation;
  if (observation != nil) {
    [observation checkContentLayout];
  } else {
    [link invalidate];
  }
}
@end

@implementation GranitePortalContentLayoutObservation {
  __weak PortalHostContainerView *_owner;
  NSString *_nativeId;
  void (^_onReady)(void);
  CADisplayLink *_displayLink;
}

- (instancetype)initWithOwner:(PortalHostContainerView *)owner
                     nativeId:(NSString *)nativeId
                      onReady:(void (^)(void))onReady
{
  if (self = [super init]) {
    _owner = owner;
    _nativeId = [nativeId copy];
    _onReady = [onReady copy];
  }
  return self;
}

- (void)startIfNeeded
{
  PortalHostContainerView *owner = _owner;
  if (_displayLink != nil || _onReady == nil || owner.window == nil ||
      [owner portalContentLayoutHost] == nil) {
    return;
  }
  // A nativeId-only update does not have to insert a view or request layout.
  GranitePortalContentLayoutTickTarget *target = [GranitePortalContentLayoutTickTarget new];
  target.observation = self;
  _displayLink = [CADisplayLink displayLinkWithTarget:target selector:@selector(tick:)];
  [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
}

- (void)checkContentLayout
{
  PortalHostContainerView *owner = _owner;
  if (owner == nil || _onReady == nil) {
    [self cancel];
    return;
  }
  UIView *host = [owner portalContentLayoutHost];
  if (host == nil || owner.window == nil) return;
  UIView *marker = GraniteFindInitialContentMarker(host, _nativeId);
  if (marker != nil && GraniteHasInitialContentLayout(marker, host, owner)) {
    void (^onReady)(void) = _onReady;
    [self cancel];
    onReady();
  }
}

- (void)cancel
{
  if (![NSThread isMainThread]) {
    [NSException raise:NSInternalInconsistencyException format:@"Content layout must be cancelled on the main thread"];
  }
  PortalHostContainerView *owner = _owner;
  _owner = nil;
  _onReady = nil;
  _nativeId = nil;
  [_displayLink invalidate];
  _displayLink = nil;
  [owner removeContentLayoutObservation:self];
}

- (void)dealloc
{
  [_displayLink invalidate];
}
@end

@implementation PortalHostContainerView {
  RCTRootComponentView *_reactRootAnchor;
  PortalHostView *_portalHostView;
  RCTSurfaceTouchHandler *_touchHandler;
  NSString *_pendingName;
  BOOL _hasAttachedContent;
  NSString *_contentLayoutName;
  NSMutableSet<GranitePortalContentLayoutObservation *> *_contentLayoutObservations;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  return [self initWithFrame:frame deferredActivation:NO];
}

- (instancetype)initWithFrame:(CGRect)frame deferredActivation:(BOOL)deferredActivation
{
  if (self = [super initWithFrame:frame]) {
    if (!deferredActivation) {
      [self activateIfNeeded];
    }
  }
  return self;
}

- (nullable instancetype)initWithCoder:(NSCoder *)coder
{
  if (self = [super initWithCoder:coder]) {
    [self activateIfNeeded];
  }
  return self;
}

- (id<PortalContentLayoutObservation>)observeContentLayoutWithRequestKey:(NSString *)requestKey
                                                              revision:(NSInteger)revision
                                                               onReady:(void (^)(void))onReady
{
  if (![NSThread isMainThread]) {
    [NSException raise:NSInternalInconsistencyException format:@"Content layout must be observed on the main thread"];
  }
  if (requestKey.length == 0 || revision < 0 || revision > INT32_MAX || onReady == nil) {
    [NSException raise:NSInvalidArgumentException format:@"A nonempty request key, Int32 revision, and callback are required"];
  }
  NSString *nativeId = [NSString stringWithFormat:@"granite:portal-initial-content:%ld:%@", (long)revision, requestKey];
  GranitePortalContentLayoutObservation *observation =
      [[GranitePortalContentLayoutObservation alloc] initWithOwner:self nativeId:nativeId onReady:onReady];
  if (_contentLayoutObservations == nil) _contentLayoutObservations = [NSMutableSet new];
  [_contentLayoutObservations addObject:observation];
  [observation startIfNeeded];
  return observation;
}

- (UIView *)portalContentLayoutHost
{
  return _portalHostView;
}

- (void)removeContentLayoutObservation:(GranitePortalContentLayoutObservation *)observation
{
  [_contentLayoutObservations removeObject:observation];
}

- (void)cancelContentLayoutObservations
{
  for (GranitePortalContentLayoutObservation *observation in _contentLayoutObservations.allObjects) {
    [observation cancel];
  }
}

- (void)startContentLayoutObservations
{
  for (GranitePortalContentLayoutObservation *observation in _contentLayoutObservations.allObjects) {
    [observation startIfNeeded];
  }
}

- (void)willMoveToWindow:(UIWindow *)newWindow
{
  if (self.window != nil && self.window != newWindow) [self cancelContentLayoutObservations];
  [super willMoveToWindow:newWindow];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self startContentLayoutObservations];
}

- (void)cancelContentLayoutIfResizedFrom:(CGSize)previousSize
{
  if (previousSize.width > 0 && previousSize.height > 0 &&
      !CGSizeEqualToSize(previousSize, self.bounds.size)) {
    [self cancelContentLayoutObservations];
  }
}

- (void)setFrame:(CGRect)frame
{
  CGSize previousSize = self.bounds.size;
  [super setFrame:frame];
  [self cancelContentLayoutIfResizedFrom:previousSize];
}

- (void)setBounds:(CGRect)bounds
{
  CGSize previousSize = self.bounds.size;
  [super setBounds:bounds];
  [self cancelContentLayoutIfResizedFrom:previousSize];
}

- (BOOL)isActivated
{
  return _portalHostView != nil;
}

- (BOOL)hasAttachedContent
{
  return _hasAttachedContent;
}

- (void)activateIfNeeded
{
  if (_portalHostView != nil) {
    return;
  }

  // Hosted content mounts under an RCTRootComponentView anchor so react-native-screens treats
  // hosted screens as root-mounted. RNSScreenView walks its superview chain for an
  // RCTRootComponentView (or another RNSScreenView) in -isMountedUnderScreenOrReactRoot and, when
  // it finds none, attaches its own RCTSurfaceTouchHandler in -didMoveToWindow. Under a Portal
  // host that second handler would sit beneath this container's handler, every tap would reach JS
  // twice, and on the second touchStart an ancestor PanResponder could steal the responder from
  // the tapped Pressable. With the anchor, hosted screens see the same tree shape as content under
  // a regular RCTSurfaceView: one handler, page coordinates relative to this container.
  //
  // The anchor is never registered with Fabric (tag 0, no event emitter, no shadow node); it is
  // only a superview. The host view joins it through -addSubview:, not
  // -mountChildComponentView:index:, so the anchor never posts RCTContentDidAppearNotification.
  // It is created here rather than in -init for the same reason the host view is deferred: an
  // RCTViewComponentView reads ReactNativeFeatureFlags while it settles into the view hierarchy,
  // which must not happen before the host's boot-time override (see the header on deferred
  // activation).
  _reactRootAnchor = [[RCTRootComponentView alloc] initWithFrame:self.bounds];
  _reactRootAnchor.autoresizingMask =
      UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  [self addSubview:_reactRootAnchor];

  _portalHostView = [[PortalHostView alloc] initWithFrame:_reactRootAnchor.bounds];
  _portalHostView.autoresizingMask =
      UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  __weak PortalHostContainerView *weakSelf = self;
  _portalHostView.onSubviewCountChanged = ^{
    [weakSelf handleSubviewCountChanged];
  };
  [_reactRootAnchor addSubview:_portalHostView];

  _touchHandler = [GranitePortalSurfaceTouchHandler new];
  [_touchHandler attachToView:self];

  if (_pendingName) {
    [_portalHostView setName:_pendingName];
    _pendingName = nil;
  }
  [self startContentLayoutObservations];
}

- (void)setName:(nullable NSString *)name
{
  if (_contentLayoutName != name && ![_contentLayoutName isEqualToString:name]) {
    [self cancelContentLayoutObservations];
  }
  _contentLayoutName = [name copy];
  if (_portalHostView) {
    [_portalHostView setName:name];
  } else {
    _pendingName = [name copy];
  }
}

- (void)handleSubviewCountChanged
{
  NSUInteger count = _portalHostView.subviews.count;
  if (count > 0) {
    if (!_hasAttachedContent) {
      _hasAttachedContent = YES;
      if (self.onContentDidAttach) {
        self.onContentDidAttach();
      }
    }
    return;
  }

  if (!_hasAttachedContent) {
    return;
  }

  // Removal and re-insertion can happen within a single mount commit (e.g.
  // the content moves between hosts). Confirm emptiness on the next run loop
  // before reporting a detach.
  __weak PortalHostContainerView *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    PortalHostContainerView *strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_hasAttachedContent) {
      return;
    }
    if (strongSelf->_portalHostView.subviews.count == 0) {
      strongSelf->_hasAttachedContent = NO;
      if (strongSelf.onContentDidDetach) {
        strongSelf.onContentDidDetach();
      }
    }
  });
}

- (void)invalidate
{
  [self cancelContentLayoutObservations];
  _contentLayoutName = nil;
  _pendingName = nil;
  _portalHostView.onSubviewCountChanged = nil;
  [_portalHostView setName:nil];
  self.onContentDidAttach = nil;
  self.onContentDidDetach = nil;
}

- (void)dealloc
{
  _portalHostView.onSubviewCountChanged = nil;
  [self cancelContentLayoutObservations];
  [_portalHostView setName:nil];
  // Do not call -detachFromView: here. RCTSurfaceTouchHandler asserts that
  // the recognizer is still attached to the given view, and during dealloc
  // UIKit may have released that association already, turning teardown into
  // an abort. UIView teardown removes the recognizer on its own.
  _touchHandler = nil;
}

@end
