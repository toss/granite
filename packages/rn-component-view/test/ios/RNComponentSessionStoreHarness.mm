// Exercises the component-session store without React. It uses Foundation only, so it builds and runs on the Mac.
// `yarn test` runs it with the iOS harnesses when GRANITE_IOS_TOUCH_HARNESS_SIMULATOR is set (see
// src/RNComponentView.ios.spec.ts). By hand, from this package:
//
//   xcrun clang++ -ObjC++ -fobjc-arc -I ios test/ios/RNComponentSessionStoreHarness.mm ios/RNComponentSessions.mm \
//     ios/RNComponentSessionStore.mm -framework Foundation -o /tmp/rn-component-session-store-harness \
//     && /tmp/rn-component-session-store-harness

#import <Foundation/Foundation.h>

#import "RNComponentSessionStore.h"

@interface FakeEventSink : NSObject <RNComponentEventSink>
@property(nonatomic, strong) NSMutableArray<NSDictionary *> *componentEvents;
@end

@implementation FakeEventSink

- (instancetype)init
{
  if (self = [super init]) {
    _componentEvents = [NSMutableArray array];
  }
  return self;
}

- (BOOL)enqueueEvent:(NSDictionary *)event
{
  [_componentEvents addObject:event];
  return YES;
}

@end

static void Expect(BOOL condition, NSString *message)
{
  if (!condition) {
    NSLog(@"%@", message);
    exit(1);
  }
}

static NSArray<NSString *> *EventNames(FakeEventSink *sink)
{
  return [sink.componentEvents valueForKey:@"name"];
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

int main(void)
{
  @autoreleasepool {
    __block NSInteger rendererChangeCount = 0;
    [NSNotificationCenter.defaultCenter addObserverForName:RNComponentRendererDidChangeNotification
                                                    object:nil
                                                     queue:nil
                                                usingBlock:^(NSNotification *notification) {
                                                  rendererChangeCount += 1;
                                                }];

    // A renderer that starts later receives the components opened before it, with their latest props.
    RNComponentSessionRegistration *first = nil;
    RNComponentSessionRegistration *second = nil;
    // Drain autoreleased references so releasing `first` below deallocates it immediately.
    @autoreleasepool {
      first = [RNComponentSessions registerSession:@"first"];
      second = [RNComponentSessions registerSession:@"second"];
    }
    Expect([RNComponentSessions registerSession:@"first"] == nil,
           @"a duplicate session id should be rejected");
    [first openComponentWithName:@"Demo"
                           props:@{ @"count" : @1 }
                          sizing:RNComponentViewSizingContentHeight
                  bundleFilePath:nil];
    [first openComponentWithName:@"Other"
                           props:@{}
                          sizing:RNComponentViewSizingConstrained
                  bundleFilePath:nil];
    Expect([first updateProps:@{ @"count" : @2 }], @"an open component should accept props");
    Expect(![second updateProps:@{ @"count" : @9 }], @"a component that is not open should reject props");
    [second openComponentWithName:@"Demo"
                            props:@{}
                           sizing:RNComponentViewSizingContentSize
                   bundleFilePath:@"/bundles/demo.hbc"];
    Expect(!RNComponentSessions.isRendererAttached, @"no renderer should be attached yet");

    FakeEventSink *sink = [FakeEventSink new];
    [RNComponentSessionStore.sharedStore startDeliveryToEventSink:sink];
    Expect(RNComponentSessions.isRendererAttached, @"the renderer should be attached");
    Expect([EventNames(sink) isEqualToArray:@[ @"openComponent", @"openComponent" ]],
           @"a starting renderer should receive every open component once");
    NSDictionary *firstOpen = sink.componentEvents[0][@"params"];
    Expect([firstOpen[@"sessionId"] isEqualToString:@"first"], @"components should arrive in open order");
    Expect([firstOpen[@"componentName"] isEqualToString:@"Demo"], @"only the first open should count");
    Expect([firstOpen[@"props"] isEqualToDictionary:@{ @"count" : @2 }], @"the snapshot should carry the latest props");
    Expect([firstOpen[@"sizing"] isEqualToString:@"contentHeight"], @"the sizing should be named");
    Expect(firstOpen[@"bundleFilePath"] == nil, @"a component without a bundle should omit the path");
    NSDictionary *secondOpen = sink.componentEvents[1][@"params"];
    Expect([secondOpen[@"sizing"] isEqualToString:@"contentSize"], @"the second sizing should be named");
    Expect([secondOpen[@"bundleFilePath"] isEqualToString:@"/bundles/demo.hbc"], @"the bundle path should be sent");
    Expect(RunMainQueueUntil(^{ return (BOOL)(rendererChangeCount == 1); }), @"attaching should post a change");

    // While attached, changes arrive as they happen.
    [sink.componentEvents removeAllObjects];
    Expect([second updateProps:@{ @"count" : @3 }], @"an open component should accept props");
    [second invalidate];
    Expect(![second updateProps:@{ @"count" : @4 }], @"an invalidated component should reject props");
    Expect([EventNames(sink) isEqualToArray:@[ @"updateComponentProps", @"closeComponent" ]],
           @"an attached renderer should receive updates and closes in order");
    Expect([sink.componentEvents[0][@"params"][@"props"] isEqualToDictionary:@{ @"count" : @3 }],
           @"an update should carry the new props");

    RNComponentSessionRegistration *unopened =
        [RNComponentSessions registerSession:@"unopened"];
    [sink.componentEvents removeAllObjects];
    [unopened invalidate];
    Expect(sink.componentEvents.count == 0, @"a component that never opened should not send a close");

    // A repeated start from the attached renderer resends the open components without a second change.
    [RNComponentSessionStore.sharedStore startDeliveryToEventSink:sink];
    Expect([EventNames(sink) isEqualToArray:@[ @"openComponent" ]], @"a repeated start should resend the snapshot");

    // The first live renderer wins until it detaches.
    FakeEventSink *restartedSink = [FakeEventSink new];
    [RNComponentSessionStore.sharedStore startDeliveryToEventSink:restartedSink];
    Expect(restartedSink.componentEvents.count == 0, @"a second renderer should wait for the first to detach");

    // Content sizes reach the handler on the main thread, only from the attached renderer.
    __block NSValue *reportedSize = nil;
    __block BOOL reportedOnMainThread = NO;
    first.contentSizeHandler = ^(CGSize contentSize) {
      reportedSize = [NSValue valueWithBytes:&contentSize objCType:@encode(CGSize)];
      reportedOnMainThread = NSThread.isMainThread;
    };
    [RNComponentSessionStore.sharedStore reportContentSize:CGSizeMake(10, 20)
                                                 sessionId:@"first"
                                             fromEventSink:restartedSink];
    [RNComponentSessionStore.sharedStore reportContentSize:CGSizeMake(NAN, 20) sessionId:@"first" fromEventSink:sink];
    dispatch_sync(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
      // dispatch_sync may run this on the calling thread; drain the weak read here like a module queue would.
      @autoreleasepool {
        [RNComponentSessionStore.sharedStore reportContentSize:CGSizeMake(120, 48)
                                                     sessionId:@"first"
                                                 fromEventSink:sink];
      }
    });
    Expect(RunMainQueueUntil(^{ return (BOOL)(reportedSize != nil); }), @"a size from the renderer should arrive");
    CGSize size;
    [reportedSize getValue:&size];
    Expect(CGSizeEqualToSize(size, CGSizeMake(120, 48)), @"only the valid size from the attached renderer should arrive");
    Expect(reportedOnMainThread, @"the handler should run on the main thread");

    // Detaching the renderer lets a restarted runtime attach and receive the open components again.
    [RNComponentSessionStore.sharedStore detachEventSink:sink];
    Expect(!RNComponentSessions.isRendererAttached, @"the renderer should be detached");
    Expect(RunMainQueueUntil(^{ return (BOOL)(rendererChangeCount == 2); }), @"detaching should post a change");
    [RNComponentSessionStore.sharedStore startDeliveryToEventSink:restartedSink];
    Expect([EventNames(restartedSink) isEqualToArray:@[ @"openComponent" ]],
           @"a restarted renderer should receive the open components");
    Expect([restartedSink.componentEvents[0][@"params"][@"props"] isEqualToDictionary:@{ @"count" : @2 }],
           @"a restarted renderer should receive the latest props");

    // Releasing a registration closes its component.
    [restartedSink.componentEvents removeAllObjects];
    first = nil;
    Expect([EventNames(restartedSink) isEqualToArray:@[ @"closeComponent" ]], @"releasing should close the component");
    reportedSize = nil;
    [RNComponentSessionStore.sharedStore reportContentSize:CGSizeMake(1, 1)
                                                 sessionId:@"first"
                                             fromEventSink:restartedSink];
    Expect(!RunMainQueueUntil(^{ return (BOOL)(reportedSize != nil); }), @"a closed component should not get sizes");

    NSLog(@"RNComponentSessionStoreHarness passed");
  }
  return 0;
}
