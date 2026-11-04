// Exercises RNComponentView against the real component-session store and the micro-frontend Portal container, with
// React stubbed out. `yarn test` builds it for the iOS simulator and runs it in the simulator that
// GRANITE_IOS_TOUCH_HARNESS_SIMULATOR names (see src/RNComponentView.ios.spec.ts). By hand, from this package:
//
//   mkdir -p /tmp/rn-component-view-include && ln -sfn "$PWD/../micro-frontend/ios" \
//     /tmp/rn-component-view-include/GraniteMicroFrontendRuntime
//   xcrun -sdk iphonesimulator clang++ -ObjC++ -fobjc-arc -target arm64-apple-ios18.0-simulator \
//     -I /tmp/rn-component-view-include -I ../micro-frontend/test/ios/stubs -I ios \
//     test/ios/RNComponentViewHarness.mm ios/RNComponentView.mm ios/RNComponentSessions.mm \
//     ios/RNComponentSessionStore.mm ../micro-frontend/ios/PortalHostContainerView.mm \
//     -framework UIKit -framework CoreGraphics -o /tmp/rn-component-view-harness
//   xcrun simctl spawn booted /tmp/rn-component-view-harness

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTRootComponentView.h>
#import <React/RCTSurfaceTouchHandler.h>

#import "RNComponentSessionStore.h"
#import <GraniteMicroFrontendRuntime/PortalHostContainerView.h>
#import <GraniteMicroFrontendRuntime/PortalHostView.h>
#import "RNComponentView.h"

@implementation RCTViewComponentView
@end

@implementation RCTRootComponentView
@end

@implementation RCTSurfaceTouchHandler
- (void)attachToView:(UIView *)view
{
  [view addGestureRecognizer:self];
}

- (void)detachFromView:(UIView *)view
{
  [view removeGestureRecognizer:self];
}
@end

@implementation PortalHostView
@synthesize onSubviewCountChanged;
- (void)setName:(nullable NSString *)name {}
- (NSInteger)nextInsertionIndexForChildAt:(NSInteger)childIndex
{
  return childIndex;
}

- (void)notifyLayoutChanged {}
@end

@interface FakeComponentEventSink : NSObject <RNComponentEventSink>
@property(nonatomic, strong) NSMutableArray<NSDictionary *> *events;
@end

@implementation FakeComponentEventSink

- (instancetype)init
{
  if (self = [super init]) {
    _events = [NSMutableArray array];
  }
  return self;
}

- (BOOL)enqueueEvent:(NSDictionary *)event
{
  [_events addObject:event];
  return YES;
}

@end

@interface RecordingDelegate : NSObject <RNComponentViewDelegate>
@property(nonatomic, assign) BOOL shouldOpenSession;
@property(nonatomic, assign) NSInteger didOpenSessionCount;
@property(nonatomic, strong) NSMutableArray<NSValue *> *contentSizes;
/// Events the sink had received when the delegate heard the session open.
@property(nonatomic, copy) NSArray<NSDictionary *> *eventsAtOpen;
@property(nonatomic, weak) FakeComponentEventSink *sink;
@end

@implementation RecordingDelegate

- (instancetype)init
{
  if (self = [super init]) {
    _shouldOpenSession = YES;
    _contentSizes = [NSMutableArray array];
  }
  return self;
}

- (BOOL)componentViewShouldOpenSession:(RNComponentView *)componentView
{
  return _shouldOpenSession;
}

- (void)componentViewDidOpenSession:(RNComponentView *)componentView
{
  _didOpenSessionCount += 1;
  _eventsAtOpen = [_sink.events copy];
}

- (void)componentView:(RNComponentView *)componentView didChangeContentSize:(CGSize)contentSize
{
  [_contentSizes addObject:[NSValue valueWithCGSize:contentSize]];
}

@end

static FakeComponentEventSink *sink;
static UIWindow *window;

static void Expect(BOOL condition, NSString *message)
{
  if (!condition) {
    NSLog(@"%@", message);
    exit(1);
  }
}

static void ExpectSize(CGSize actual, CGSize expected, NSString *message)
{
  Expect(CGSizeEqualToSize(actual, expected),
         [NSString stringWithFormat:@"%@: expected {%g, %g}, got {%g, %g}",
                                    message,
                                    expected.width,
                                    expected.height,
                                    actual.width,
                                    actual.height]);
}

/// Runs the main queue until `condition` holds or a second passes.
static BOOL RunMainQueueUntil(BOOL (^condition)(void))
{
  NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:1];
  while (!condition() && deadline.timeIntervalSinceNow > 0) {
    [NSRunLoop.mainRunLoop runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.01]];
  }
  return condition();
}

static NSArray<NSDictionary *> *EventsForSession(NSArray<NSDictionary *> *events, NSString *sessionId)
{
  NSPredicate *predicate = [NSPredicate predicateWithFormat:@"params.sessionId == %@", sessionId];
  return [events filteredArrayUsingPredicate:predicate];
}

static NSArray<NSString *> *EventNamesForSession(NSString *sessionId)
{
  return [EventsForSession(sink.events, sessionId) valueForKey:@"name"];
}

static PortalHostContainerView *PortalHostContainer(RNComponentView *componentView)
{
  for (UIView *subview in componentView.subviews) {
    if ([subview isKindOfClass:[PortalHostContainerView class]]) {
      return (PortalHostContainerView *)subview;
    }
  }
  return nil;
}

static PortalHostView *FindPortalHostView(UIView *view)
{
  if ([view isKindOfClass:[PortalHostView class]]) {
    return (PortalHostView *)view;
  }
  for (UIView *subview in view.subviews) {
    PortalHostView *portalHostView = FindPortalHostView(subview);
    if (portalHostView != nil) {
      return portalHostView;
    }
  }
  return nil;
}

/// Mounts a content view the way the Portal does when the renderer draws the component.
static void AttachContent(RNComponentView *componentView)
{
  PortalHostView *portalHostView = FindPortalHostView(componentView);
  Expect(portalHostView != nil, @"an active view hosts a Portal host view");
  [portalHostView addSubview:[UIView new]];
  portalHostView.onSubviewCountChanged();
}

static void ReportContentSize(RNComponentView *componentView, CGSize contentSize)
{
  [RNComponentSessionStore.sharedStore reportContentSize:contentSize
                                               sessionId:componentView.sessionId
                                           fromEventSink:sink];
}

static RNComponentView *MakeView(RNComponentViewSizing sizing, RecordingDelegate *delegate)
{
  RNComponentView *componentView = [[RNComponentView alloc] initWithComponentName:@"Greeting"
                                                                            props:@{@"title" : @"first"}
                                                                           sizing:sizing
                                                                   bundleFilePath:nil];
  componentView.delegate = delegate;
  return componentView;
}

static void TestOpensTheSessionOnceWhenTheViewFirstMovesToAWindow(void)
{
  RecordingDelegate *delegate = [RecordingDelegate new];
  delegate.sink = sink;
  RNComponentView *componentView = MakeView(RNComponentViewSizingContentHeight, delegate);
  Expect(EventNamesForSession(componentView.sessionId).count == 0, @"a view off the window has no session");

  [window addSubview:componentView];
  NSArray<NSDictionary *> *events = EventsForSession(sink.events, componentView.sessionId);
  Expect([[events valueForKey:@"name"] isEqualToArray:@[ @"openComponent" ]], @"moving to a window opens the session");
  NSDictionary *params = events.firstObject[@"params"];
  Expect([params[@"componentName"] isEqualToString:@"Greeting"], @"the session opens the component");
  Expect([params[@"props"] isEqualToDictionary:@{@"title" : @"first"}], @"the session opens with the props");
  Expect([params[@"sizing"] isEqualToString:@"contentHeight"], @"the session opens with the sizing");
  Expect(delegate.didOpenSessionCount == 1, @"the delegate hears the session open");
  Expect([[EventsForSession(delegate.eventsAtOpen, componentView.sessionId) valueForKey:@"name"]
             isEqualToArray:@[ @"openComponent" ]],
         @"the delegate hears the open after the session opened");

  [componentView removeFromSuperview];
  [window addSubview:componentView];
  Expect([EventNamesForSession(componentView.sessionId) isEqualToArray:@[ @"openComponent" ]],
         @"leaving and rejoining a window keeps the one session open");
  Expect(delegate.didOpenSessionCount == 1, @"the session opens once");
  [componentView removeFromSuperview];
}

static void TestOpensWithTheLatestPropsAndForwardsLaterProps(void)
{
  RNComponentView *componentView = MakeView(RNComponentViewSizingContentHeight, nil);
  [componentView updateProps:@{@"title" : @"second"}];
  [window addSubview:componentView];
  NSDictionary *openEvent = EventsForSession(sink.events, componentView.sessionId).firstObject;
  Expect([openEvent[@"params"][@"props"] isEqualToDictionary:@{@"title" : @"second"}],
         @"the session opens with the props set before opening");

  [componentView updateProps:@{@"title" : @"third"}];
  NSDictionary *updateEvent = EventsForSession(sink.events, componentView.sessionId).lastObject;
  Expect([updateEvent[@"name"] isEqualToString:@"updateComponentProps"], @"an open session forwards new props");
  Expect([updateEvent[@"params"][@"props"] isEqualToDictionary:@{@"title" : @"third"}], @"the update carries the props");
  [componentView removeFromSuperview];
}

static void TestClosesTheSessionWhenDeallocated(void)
{
  NSString *sessionId = nil;
  @autoreleasepool {
    RNComponentView *componentView = MakeView(RNComponentViewSizingContentHeight, nil);
    sessionId = componentView.sessionId;
    [window addSubview:componentView];
    [componentView removeFromSuperview];
    Expect(![EventNamesForSession(sessionId) containsObject:@"closeComponent"], @"leaving the window keeps the session");
  }
  Expect([EventNamesForSession(sessionId) isEqualToArray:@[ @"openComponent", @"closeComponent" ]],
         @"deallocating the view closes the session");
}

static void TestContentHeightFollowsTheMeasuredHeight(void)
{
  RecordingDelegate *delegate = [RecordingDelegate new];
  RNComponentView *componentView = MakeView(RNComponentViewSizingContentHeight, delegate);
  [window addSubview:componentView];
  ExpectSize(componentView.intrinsicContentSize,
             CGSizeMake(UIViewNoIntrinsicMetric, RNComponentView.placeholderSize.height),
             @"contentHeight takes the placeholder height before the first measurement");
  Expect(!componentView.placeholderView.hidden, @"the placeholder covers the view before content attaches");
  Expect(RNComponentView.placeholderSize.width > 0 && RNComponentView.placeholderSize.height > 0,
         @"the Portal lays content out only in a host whose width and height are both non-zero");

  AttachContent(componentView);
  Expect(!componentView.placeholderView.hidden, @"content-sized content waits for its measurement");

  ReportContentSize(componentView, CGSizeMake(300, 120));
  Expect(RunMainQueueUntil(^{
           return (BOOL)(delegate.contentSizes.count == 1);
         }),
         @"the delegate hears the measured size");
  Expect(CGSizeEqualToSize(delegate.contentSizes.firstObject.CGSizeValue, CGSizeMake(300, 120)),
         @"the delegate receives the measured size");
  Expect(componentView.hasContentSize && CGSizeEqualToSize(componentView.contentSize, CGSizeMake(300, 120)),
         @"the view keeps the measured size");
  ExpectSize(componentView.intrinsicContentSize,
             CGSizeMake(UIViewNoIntrinsicMetric, 120),
             @"contentHeight takes the measured height and leaves the width to the layout");
  Expect(componentView.placeholderView.hidden, @"measured, attached content replaces the placeholder");

  ReportContentSize(componentView, CGSizeMake(300, 120));
  ReportContentSize(componentView, CGSizeMake(300, 150));
  Expect(RunMainQueueUntil(^{
           return (BOOL)(delegate.contentSizes.count >= 2);
         }),
         @"the delegate hears a changed size");
  Expect(delegate.contentSizes.count == 2, @"an unchanged size is not reported again");
  [componentView removeFromSuperview];
}

static void TestContentSizeFollowsTheMeasuredSize(void)
{
  RecordingDelegate *delegate = [RecordingDelegate new];
  RNComponentView *componentView = MakeView(RNComponentViewSizingContentSize, delegate);
  [window addSubview:componentView];
  ExpectSize(componentView.intrinsicContentSize,
             RNComponentView.placeholderSize,
             @"contentSize takes the placeholder size before the first measurement");

  ReportContentSize(componentView, CGSizeMake(200, 90));
  Expect(RunMainQueueUntil(^{
           return (BOOL)(delegate.contentSizes.count == 1);
         }),
         @"the delegate hears the measured size");
  ExpectSize(componentView.intrinsicContentSize, CGSizeMake(200, 90), @"contentSize takes the measured size");

  componentView.unavailable = YES;
  ExpectSize(componentView.intrinsicContentSize, CGSizeZero, @"an unavailable contentSize view collapses");
  Expect(componentView.placeholderView.hidden, @"an unavailable view shows no placeholder");
  Expect(PortalHostContainer(componentView).hidden, @"an unavailable view shows no content");

  componentView.unavailable = NO;
  ExpectSize(componentView.intrinsicContentSize, CGSizeMake(200, 90), @"an available view takes its size back");
  Expect(!PortalHostContainer(componentView).hidden, @"an available view shows its content");
  [componentView removeFromSuperview];
}

static void TestConstrainedTakesItsSizeFromTheLayout(void)
{
  RecordingDelegate *delegate = [RecordingDelegate new];
  RNComponentView *componentView = MakeView(RNComponentViewSizingConstrained, delegate);
  CGSize noIntrinsicSize = CGSizeMake(UIViewNoIntrinsicMetric, UIViewNoIntrinsicMetric);
  [window addSubview:componentView];
  ExpectSize(componentView.intrinsicContentSize, noIntrinsicSize, @"constrained has no intrinsic size");
  NSDictionary *openEvent = EventsForSession(sink.events, componentView.sessionId).firstObject;
  Expect([openEvent[@"params"][@"sizing"] isEqualToString:@"constrained"], @"the session opens with the sizing");

  AttachContent(componentView);
  Expect(componentView.placeholderView.hidden, @"constrained content needs no measurement to replace the placeholder");

  componentView.unavailable = YES;
  ExpectSize(componentView.intrinsicContentSize, noIntrinsicSize, @"an unavailable constrained view keeps the layout size");
  Expect(componentView.placeholderView.hidden && PortalHostContainer(componentView).hidden,
         @"an unavailable constrained view shows nothing");
  [componentView removeFromSuperview];
}

static void TestDeclinedViewStaysEmpty(void)
{
  RecordingDelegate *delegate = [RecordingDelegate new];
  delegate.shouldOpenSession = NO;
  RNComponentView *componentView = MakeView(RNComponentViewSizingContentHeight, delegate);
  [window addSubview:componentView];
  Expect(EventNamesForSession(componentView.sessionId).count == 0, @"a declined view opens no session");
  Expect(delegate.didOpenSessionCount == 0, @"a declined view does not report an open session");
  ExpectSize(componentView.intrinsicContentSize,
             CGSizeMake(UIViewNoIntrinsicMetric, 0),
             @"a declined contentHeight view collapses its height");
  Expect(componentView.placeholderView.hidden, @"a declined view shows no placeholder");

  delegate.shouldOpenSession = YES;
  [componentView removeFromSuperview];
  [window addSubview:componentView];
  [componentView updateProps:@{@"title" : @"second"}];
  Expect(EventNamesForSession(componentView.sessionId).count == 0, @"the delegate is asked only once");
  [componentView removeFromSuperview];
}

static void TestDeferredActivationWaitsForActivateIfNeeded(void)
{
  RecordingDelegate *delegate = [RecordingDelegate new];
  RNComponentView *deferredView = [[RNComponentView alloc] initWithComponentName:@"Greeting"
                                                                           props:@{}
                                                                          sizing:RNComponentViewSizingContentHeight
                                                                  bundleFilePath:@"/tmp/greeting.hbc"
                                                              deferredActivation:YES];
  deferredView.delegate = delegate;
  [window addSubview:deferredView];
  Expect(delegate.didOpenSessionCount == 1, @"a deferred view opens its session");
  NSDictionary *openEvent = EventsForSession(sink.events, deferredView.sessionId).firstObject;
  Expect([openEvent[@"params"][@"bundleFilePath"] isEqualToString:@"/tmp/greeting.hbc"],
         @"the session opens with the bundle file path");
  Expect(!PortalHostContainer(deferredView).isActivated, @"a deferred Portal host waits for activation");
  [deferredView activateIfNeeded];
  Expect(PortalHostContainer(deferredView).isActivated, @"activateIfNeeded activates the Portal host");
  [deferredView removeFromSuperview];

  RNComponentView *immediateView = MakeView(RNComponentViewSizingContentHeight, nil);
  Expect(PortalHostContainer(immediateView).isActivated, @"a view activates its Portal host immediately by default");
}

int main(void)
{
  @autoreleasepool {
    sink = [FakeComponentEventSink new];
    [RNComponentSessionStore.sharedStore startDeliveryToEventSink:sink];
    window = [[UIWindow alloc] initWithFrame:CGRectMake(0, 0, 400, 800)];

    TestOpensTheSessionOnceWhenTheViewFirstMovesToAWindow();
    TestOpensWithTheLatestPropsAndForwardsLaterProps();
    TestClosesTheSessionWhenDeallocated();
    TestContentHeightFollowsTheMeasuredHeight();
    TestContentSizeFollowsTheMeasuredSize();
    TestConstrainedTakesItsSizeFromTheLayout();
    TestDeclinedViewStaysEmpty();
    TestDeferredActivationWaitsForActivateIfNeeded();
    NSLog(@"RNComponentViewHarness passed");
  }
  return 0;
}
