#import "PortalHostContainerView.h"

#import <React/RCTSurfaceTouchHandler.h>
#import "PortalHostView.h"

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

  _touchHandler = [RCTSurfaceTouchHandler new];
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
