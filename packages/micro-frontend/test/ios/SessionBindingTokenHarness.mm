#import "GraniteMicroFrontendRuntimeHost+Internal.h"
#include <cassert>

@interface RecordingRuntimeSink : NSObject <GraniteMicroFrontendRuntimeEventSink>
@property(nonatomic, strong) NSMutableArray<NSDictionary *> *events;
@end
@implementation RecordingRuntimeSink
- (BOOL)enqueueRuntimeEvent:(NSDictionary *)event {
  [_events addObject:event];
  return YES;
}
@end

int main(void) {
  @autoreleasepool {
    assert([GraniteMicroFrontendViewControllerSessionBinding respondsToSelector:
        @selector(bindViewController:sessionId:appName:scheme:)]);
    assert([GraniteMicroFrontendViewControllerSessionBinding respondsToSelector:
        @selector(bindViewController:sessionId:appName:scheme:key:rootKey:)]);
    RecordingRuntimeSink *sink = [RecordingRuntimeSink new];
    sink.events = [NSMutableArray new];
    [GraniteMicroFrontendRuntimeHost startEventDeliveryToEventSink:sink];
    GraniteMicroFrontendSessionRegistration *scoped = [GraniteMicroFrontendRuntimeHost registerSession:@"scoped"];
    [scoped openAppWithAppName:@"shopping" scheme:@"granite://shopping" key:@"native:A" rootKey:@"native:root"];
    [scoped openAppWithAppName:@"shopping" scheme:@"granite://shopping" key:@"native:ignored" rootKey:nil];
    assert(sink.events.count == 1);
    assert([sink.events[0][@"params"][@"key"] isEqual:@"native:A"]);
    assert([sink.events[0][@"params"][@"rootKey"] isEqual:@"native:root"]);

    GraniteMicroFrontendSessionRegistration *legacy = [GraniteMicroFrontendRuntimeHost registerSession:@"legacy"];
    [legacy openAppWithAppName:@"price-mission" scheme:@"granite://price-mission"];
    assert(sink.events[1][@"params"][@"key"] == nil);
    assert(sink.events[1][@"params"][@"rootKey"] == nil);

    // NSParameterAssert disappears in release builds. Invalid metadata must not
    // mark the registration opened or emit an event that JS cannot parse.
    for (NSUInteger index = 0; index < 4; index++) {
      GraniteMicroFrontendSessionRegistration *invalid =
          [GraniteMicroFrontendRuntimeHost registerSession:[NSString stringWithFormat:@"invalid-%lu", index]];
      NSUInteger before = sink.events.count;
      BOOL rejected = NO;
      @try {
        [invalid openAppWithAppName:index == 0 ? @"" : @"shopping"
                            scheme:index == 1 ? @"" : @"granite://shopping"
                               key:index == 2 ? @"" : @"native:valid"
                           rootKey:index == 3 ? @"" : @"native:root"];
      } @catch (NSException *error) {
        rejected = [error.name isEqual:NSInvalidArgumentException];
      }
      assert(rejected);
      assert(sink.events.count == before);
      assert(![invalid setVisible:YES]);
      [invalid openAppWithAppName:@"shopping" scheme:@"granite://shopping" key:@"native:retry" rootKey:nil];
      assert(sink.events.count == before + 1);
      assert([sink.events.lastObject[@"params"][@"key"] isEqual:@"native:retry"]);
      assert(sink.events.lastObject[@"params"][@"rootKey"] == nil);
      [invalid invalidate];
    }

    [scoped invalidate];
    NSUInteger eventCount = sink.events.count;
    [scoped openAppWithAppName:@"shopping" scheme:@"granite://shopping" key:@"native:stale" rootKey:nil];
    assert(sink.events.count == eventCount);
    [legacy invalidate];

    GraniteMicroFrontendSessionRegistration *previousGeneration =
        [GraniteMicroFrontendRuntimeHost registerSession:@"runtime-replacement"];
    [previousGeneration openAppWithAppName:@"shopping" scheme:@"granite://shopping"
                                      key:@"native:generation-A" rootKey:@"native:root-A"];
    assert([sink.events.lastObject[@"params"][@"key"] isEqual:@"native:generation-A"]);
    [GraniteMicroFrontendRuntimeHost detachEventSink:sink];

    RecordingRuntimeSink *replacementSink = [RecordingRuntimeSink new];
    replacementSink.events = [NSMutableArray new];
    [GraniteMicroFrontendRuntimeHost startEventDeliveryToEventSink:replacementSink];
    assert(replacementSink.events.count == 0); // Accepted events are not a replayable session snapshot.
    [previousGeneration openAppWithAppName:@"shopping" scheme:@"granite://shopping"
                                      key:@"native:ignored" rootKey:nil];
    assert(replacementSink.events.count == 0); // The old registration cannot be reopened.
    [previousGeneration invalidate];

    GraniteMicroFrontendSessionRegistration *nextGeneration =
        [GraniteMicroFrontendRuntimeHost registerSession:@"runtime-replacement"];
    [nextGeneration openAppWithAppName:@"shopping" scheme:@"granite://shopping"
                                  key:@"native:generation-B" rootKey:@"native:root-B"];
    assert(replacementSink.events.count == 1);
    assert([replacementSink.events[0][@"params"][@"key"] isEqual:@"native:generation-B"]);
    assert([replacementSink.events[0][@"params"][@"rootKey"] isEqual:@"native:root-B"]);
    [nextGeneration invalidate];
    [GraniteMicroFrontendRuntimeHost detachEventSink:replacementSink];

    // An undelivered open remains in the queue. Closing the old native lifetime
    // before releasing it ensures replay closes A before opening its replacement B.
    GraniteMicroFrontendSessionRegistration *pendingGeneration =
        [GraniteMicroFrontendRuntimeHost registerSession:@"pending-runtime-replacement"];
    [pendingGeneration openAppWithAppName:@"shopping" scheme:@"granite://shopping"
                                     key:@"native:pending-A" rootKey:nil];
    assert([pendingGeneration closeApp]);
    [pendingGeneration invalidate];
    GraniteMicroFrontendSessionRegistration *pendingReplacement =
        [GraniteMicroFrontendRuntimeHost registerSession:@"pending-runtime-replacement"];
    [pendingReplacement openAppWithAppName:@"shopping" scheme:@"granite://shopping"
                                      key:@"native:pending-B" rootKey:nil];

    RecordingRuntimeSink *pendingSink = [RecordingRuntimeSink new];
    pendingSink.events = [NSMutableArray new];
    [GraniteMicroFrontendRuntimeHost startEventDeliveryToEventSink:pendingSink];
    assert(pendingSink.events.count == 3);
    assert([pendingSink.events[0][@"name"] isEqual:@"openApp"]);
    assert([pendingSink.events[0][@"params"][@"key"] isEqual:@"native:pending-A"]);
    assert([pendingSink.events[1][@"name"] isEqual:@"closeApp"]);
    assert([pendingSink.events[1][@"params"][@"sessionId"] isEqual:@"pending-runtime-replacement"]);
    assert([pendingSink.events[2][@"name"] isEqual:@"openApp"]);
    assert([pendingSink.events[2][@"params"][@"key"] isEqual:@"native:pending-B"]);
    [pendingReplacement invalidate];
    [GraniteMicroFrontendRuntimeHost detachEventSink:pendingSink];
    NSLog(@"SessionBindingTokenHarness PASS");
  }
  return 0;
}
