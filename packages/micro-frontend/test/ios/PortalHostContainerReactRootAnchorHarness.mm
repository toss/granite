#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTRootComponentView.h>
#import <React/RCTSurfaceTouchHandler.h>

#import "PortalHostContainerView.h"
#import "PortalHostView.h"

// The React classes PortalHostContainerView.mm depends on, reduced to what the harness needs. The
// matching headers live under test/ios/stubs.
@implementation RCTViewComponentView
@end

@implementation RCTRootComponentView
@end

@implementation RCTSurfaceTouchHandler
- (instancetype)init
{
  if (self = [super initWithTarget:nil action:nil]) {
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
@end

// Minimal Fabric host: remembers the registered name and reports added subviews synchronously so
// the container's readiness callback can be observed.
static NSString *gRegisteredHostName;

@implementation PortalHostView
@synthesize onSubviewCountChanged;

- (void)setName:(nullable NSString *)name
{
  gRegisteredHostName = [name copy];
}

- (NSInteger)nextInsertionIndexForChildAt:(NSInteger)childIndex
{
  return childIndex;
}

- (void)didAddSubview:(UIView *)subview
{
  [super didAddSubview:subview];
  if (self.onSubviewCountChanged) {
    self.onSubviewCountChanged();
  }
}
@end

static void Expect(BOOL condition, NSString *message)
{
  if (!condition) {
    NSLog(@"%@", message);
    exit(1);
  }
}

// Mirrors RNSScreenView -isMountedUnderScreenOrReactRoot (react-native-screens 4.x, new
// architecture): a screen counts as root-mounted when an RCTRootComponentView sits above it.
static BOOL HasReactRootAncestor(UIView *view)
{
  for (UIView *parent = view.superview; parent != nil; parent = parent.superview) {
    if ([parent isKindOfClass:[RCTRootComponentView class]]) {
      return YES;
    }
  }
  return NO;
}

static NSUInteger SurfaceTouchHandlerCount(UIView *view)
{
  return [view.gestureRecognizers indexesOfObjectsPassingTest:^BOOL(
                                      UIGestureRecognizer *recognizer, __unused NSUInteger index, __unused BOOL *stop) {
    return [recognizer isKindOfClass:[RCTSurfaceTouchHandler class]];
  }].count;
}

// container -> RCTRootComponentView anchor -> PortalHostView, one of each.
static BOOL HasAnchoredHostTree(PortalHostContainerView *container)
{
  UIView *anchor = container.subviews.firstObject;
  UIView *hostView = anchor.subviews.firstObject;
  return container.subviews.count == 1 && [anchor isKindOfClass:[RCTRootComponentView class]] &&
      anchor.subviews.count == 1 && [hostView isKindOfClass:[PortalHostView class]];
}

int main(void)
{
  @autoreleasepool {
    // Deferred activation keeps the tree empty and the name unregistered until -activateIfNeeded.
    PortalHostContainerView *container = [[PortalHostContainerView alloc] initWithFrame:CGRectMake(0, 0, 320, 480)
                                                                         deferredActivation:YES];
    [container setName:@"cart"];
    Expect(!container.isActivated, @"deferred container should not be activated before -activateIfNeeded");
    Expect(container.subviews.count == 0, @"deferred container should stay empty before activation");
    Expect(
        SurfaceTouchHandlerCount(container) == 0,
        @"deferred container should not attach a touch handler before activation");
    Expect(gRegisteredHostName == nil, @"deferred container should not register its name before activation");

    // Activation mounts exactly one React root anchor with the Fabric host under it.
    [container activateIfNeeded];
    Expect(container.isActivated, @"container should be activated after -activateIfNeeded");
    Expect(HasAnchoredHostTree(container), @"activation should mount one React root anchor with the host view under it");
    Expect(
        [gRegisteredHostName isEqualToString:@"cart"],
        @"pending name should be applied to the host view on activation");
    UIView *anchor = container.subviews.firstObject;
    UIView *hostView = anchor.subviews.firstObject;

    // Repeated activation is idempotent.
    [container activateIfNeeded];
    Expect(
        HasAnchoredHostTree(container) && container.subviews.firstObject == anchor &&
            anchor.subviews.firstObject == hostView,
        @"repeated activation should keep the same anchor and host view");

    // Exactly one surface touch handler, on the container; none on the anchor or the host.
    Expect(SurfaceTouchHandlerCount(container) == 1, @"container should attach exactly one surface touch handler");
    Expect(
        SurfaceTouchHandlerCount(anchor) == 0 && SurfaceTouchHandlerCount(hostView) == 0,
        @"anchor and host view should not attach touch handlers of their own");

    // Anchor and host view follow the container bounds.
    container.frame = CGRectMake(0, 0, 200, 300);
    [container layoutIfNeeded];
    Expect(
        CGRectEqualToRect(anchor.frame, container.bounds) && CGRectEqualToRect(hostView.frame, anchor.bounds),
        @"anchor and host view should follow the container bounds");

    // Hosted content finds an RCTRootComponentView above it, which is what react-native-screens
    // keys off, and the container still reports readiness when content attaches.
    __block NSUInteger attachCount = 0;
    container.onContentDidAttach = ^{
      attachCount++;
    };
    UIView *hostedLeaf = [UIView new];
    [hostView addSubview:hostedLeaf];
    Expect(HasReactRootAncestor(hostedLeaf), @"hosted content should be mounted under a React root anchor");
    Expect(
        container.hasAttachedContent && attachCount == 1,
        @"container should report the first attached content once");

    // The same check fails for content outside the anchor; the anchor is what changes the answer.
    UIView *plainParent = [UIView new];
    UIView *plainLeaf = [UIView new];
    [plainParent addSubview:plainLeaf];
    Expect(!HasReactRootAncestor(plainLeaf), @"content outside a React root anchor should not count as root-mounted");

    // Immediate activation produces the same tree shape.
    PortalHostContainerView *immediate = [[PortalHostContainerView alloc] initWithFrame:CGRectMake(0, 0, 320, 480)];
    Expect(
        immediate.isActivated && HasAnchoredHostTree(immediate),
        @"immediate activation should mount the same anchored host tree");
  }
  return 0;
}
