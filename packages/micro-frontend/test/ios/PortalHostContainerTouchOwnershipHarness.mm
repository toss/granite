#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTRootComponentView.h>
#import <React/RCTSurfaceTouchHandler.h>

#import "PortalHostContainerView.h"
#import "PortalHostView.h"

@implementation RCTViewComponentView
@end

@implementation RCTRootComponentView
@end

@implementation RCTSurfaceTouchHandler
- (instancetype)init
{
  if (self = [super initWithTarget:nil action:nil]) {
    self.cancelsTouchesInView = NO;
    self.delaysTouchesBegan = NO;
    self.delaysTouchesEnded = NO;
    self.delegate = self;
  }
  return self;
}

- (void)attachToView:(UIView *)view
{
  [view addGestureRecognizer:self];
}

- (void)detachFromView:(UIView *)view
{
  [view removeGestureRecognizer:self];
}

- (BOOL)canPreventGestureRecognizer:(UIGestureRecognizer *)preventedGestureRecognizer
{
  return NO;
}

- (BOOL)canBePreventedByGestureRecognizer:(UIGestureRecognizer *)preventingGestureRecognizer
{
  return ![preventingGestureRecognizer.view isDescendantOfView:self.view];
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRequireFailureOfGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  return [self canBePreventedByGestureRecognizer:otherGestureRecognizer];
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  return NO;
}
@end

@implementation PortalHostView
@synthesize onSubviewCountChanged;
- (void)setName:(nullable NSString *)name {}
- (NSInteger)nextInsertionIndexForChildAt:(NSInteger)childIndex
{
  return childIndex;
}
@end

@interface GranitePortalTouchOwnershipTestTouch : UITouch
@property (nonatomic, weak) UIView *testView;
@end

@implementation GranitePortalTouchOwnershipTestTouch
- (UIView *)view
{
  return self.testView;
}
@end

static UIGestureRecognizer *PortalHandlerForContainer(PortalHostContainerView *container)
{
  [container activateIfNeeded];
  return container.gestureRecognizers.firstObject;
}

static BOOL ShouldReceive(UIGestureRecognizer *recognizer, UIView *touchView)
{
  GranitePortalTouchOwnershipTestTouch *touch = [GranitePortalTouchOwnershipTestTouch new];
  touch.testView = touchView;
  id<UIGestureRecognizerDelegate> delegate = recognizer.delegate;
  if (![delegate respondsToSelector:@selector(gestureRecognizer:shouldReceiveTouch:)]) {
    return YES;
  }
  return [delegate gestureRecognizer:recognizer shouldReceiveTouch:touch];
}

static void Expect(BOOL condition, NSString *message)
{
  if (!condition) {
    NSLog(@"%@", message);
    exit(1);
  }
}

int main(void)
{
  @autoreleasepool {
    PortalHostContainerView *plainPortal = [[PortalHostContainerView alloc] initWithFrame:CGRectZero];
    UIView *plainLeaf = [UIView new];
    [plainPortal addSubview:plainLeaf];
    Expect(ShouldReceive(PortalHandlerForContainer(plainPortal), plainLeaf), @"plain portal content should receive");

    PortalHostContainerView *descendantPortal = [[PortalHostContainerView alloc] initWithFrame:CGRectZero];
    UIView *screenRoot = [UIView new];
    UIView *screenLeaf = [UIView new];
    [descendantPortal addSubview:screenRoot];
    [screenRoot addSubview:screenLeaf];
    RCTSurfaceTouchHandler *descendantHandler = [RCTSurfaceTouchHandler new];
    [descendantHandler attachToView:screenRoot];
    Expect(
        !ShouldReceive(PortalHandlerForContainer(descendantPortal), screenLeaf),
        @"descendant RN handler should own touch");

    UIView *root = [UIView new];
    PortalHostContainerView *ancestorPortal = [[PortalHostContainerView alloc] initWithFrame:CGRectZero];
    UIView *ancestorLeaf = [UIView new];
    [root addSubview:ancestorPortal];
    [ancestorPortal addSubview:ancestorLeaf];
    RCTSurfaceTouchHandler *ancestorHandler = [RCTSurfaceTouchHandler new];
    [ancestorHandler attachToView:root];
    Expect(
        !ShouldReceive(PortalHandlerForContainer(ancestorPortal), ancestorLeaf),
        @"ancestor RN handler should own touch");
    ancestorHandler.enabled = NO;
    Expect(
        ShouldReceive(PortalHandlerForContainer(ancestorPortal), ancestorLeaf),
        @"disabled RN handler should not own touch");

    PortalHostContainerView *outerPortal = [[PortalHostContainerView alloc] initWithFrame:CGRectZero];
    PortalHostContainerView *innerPortal = [[PortalHostContainerView alloc] initWithFrame:CGRectZero];
    UIView *nestedLeaf = [UIView new];
    [outerPortal addSubview:innerPortal];
    [innerPortal addSubview:nestedLeaf];
    Expect(
        ShouldReceive(PortalHandlerForContainer(innerPortal), nestedLeaf),
        @"inner portal handler should receive nested touch");
    Expect(
        !ShouldReceive(PortalHandlerForContainer(outerPortal), nestedLeaf),
        @"outer portal handler should yield nested touch");

    UIView *siblingRoot = [UIView new];
    PortalHostContainerView *siblingPortal = [[PortalHostContainerView alloc] initWithFrame:CGRectZero];
    UIView *siblingLeaf = [UIView new];
    UIView *sibling = [UIView new];
    [siblingRoot addSubview:siblingPortal];
    [siblingRoot addSubview:sibling];
    [siblingPortal addSubview:siblingLeaf];
    RCTSurfaceTouchHandler *siblingHandler = [RCTSurfaceTouchHandler new];
    [siblingHandler attachToView:sibling];
    Expect(
        ShouldReceive(PortalHandlerForContainer(siblingPortal), siblingLeaf),
        @"sibling RN handler should not own touch");

    UIView *unrelatedLeaf = [UIView new];
    Expect(
        !ShouldReceive(PortalHandlerForContainer(siblingPortal), unrelatedLeaf),
        @"unrelated touch should not receive");

    UIGestureRecognizer *portalHandler = PortalHandlerForContainer(siblingPortal);
    Expect(
        [portalHandler.delegate respondsToSelector:@selector(gestureRecognizer:shouldRequireFailureOfGestureRecognizer:)],
        @"portal handler should inherit RN failure arbitration");
    Expect(
        [portalHandler.delegate respondsToSelector:@selector(gestureRecognizer:shouldRecognizeSimultaneouslyWithGestureRecognizer:)],
        @"portal handler should inherit RN simultaneous arbitration");

    [screenLeaf removeFromSuperview];
    [descendantPortal addSubview:screenLeaf];
    Expect(
        ShouldReceive(PortalHandlerForContainer(descendantPortal), screenLeaf),
        @"relocated plain touch should return to portal owner");
    [screenRoot addSubview:screenLeaf];
    Expect(
        !ShouldReceive(PortalHandlerForContainer(descendantPortal), screenLeaf),
        @"relocated screen touch should return to RN owner");
  }
  return 0;
}
