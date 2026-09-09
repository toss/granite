#import "PortalHostContainerView.h"

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

@implementation PortalHostContainerView {
  PortalHostView *_portalHostView;
  RCTSurfaceTouchHandler *_touchHandler;
  NSString *_pendingName;
  BOOL _hasAttachedContent;
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

  _portalHostView = [[PortalHostView alloc] initWithFrame:self.bounds];
  _portalHostView.autoresizingMask =
      UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  __weak PortalHostContainerView *weakSelf = self;
  _portalHostView.onSubviewCountChanged = ^{
    [weakSelf handleSubviewCountChanged];
  };
  [self addSubview:_portalHostView];

  _touchHandler = [GranitePortalSurfaceTouchHandler new];
  [_touchHandler attachToView:self];

  if (_pendingName) {
    [_portalHostView setName:_pendingName];
    _pendingName = nil;
  }
}

- (void)setName:(nullable NSString *)name
{
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
  _pendingName = nil;
  _portalHostView.onSubviewCountChanged = nil;
  [_portalHostView setName:nil];
  self.onContentDidAttach = nil;
  self.onContentDidDetach = nil;
}

- (void)dealloc
{
  [_portalHostView setName:nil];
  // Do not call -detachFromView: here. RCTSurfaceTouchHandler asserts that
  // the recognizer is still attached to the given view, and during dealloc
  // UIKit may have released that association already, turning teardown into
  // an abort. UIView teardown removes the recognizer on its own.
  _touchHandler = nil;
}

@end
