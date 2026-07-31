#import "PortalHostContainerView.h"

#import <React/RCTSurfaceTouchHandler.h>
#import "PortalHostView.h"

@implementation PortalHostContainerView {
  PortalHostView *_portalHostView;
  RCTSurfaceTouchHandler *_touchHandler;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _portalHostView = [[PortalHostView alloc] initWithFrame:self.bounds];
    _portalHostView.autoresizingMask =
        UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self addSubview:_portalHostView];

    _touchHandler = [RCTSurfaceTouchHandler new];
    [_touchHandler attachToView:self];
  }
  return self;
}

- (void)setName:(nullable NSString *)name
{
  [_portalHostView setName:name];
}

- (void)dealloc
{
  [_portalHostView setName:nil];
  [_touchHandler detachFromView:self];
}

@end
