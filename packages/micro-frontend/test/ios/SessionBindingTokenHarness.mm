#import "GraniteMicroFrontendRuntimeHost+Internal.h"

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
    RecordingRuntimeSink *sink = [RecordingRuntimeSink new];
    sink.events = [NSMutableArray new];
    [GraniteMicroFrontendRuntimeHost startEventDeliveryToEventSink:sink];
    GraniteMicroFrontendSessionRegistration *scoped = [GraniteMicroFrontendRuntimeHost registerSession:@"scoped"];
    [scoped openAppWithAppName:@"shopping" scheme:@"granite://shopping" key:@"native:A" rootKey:@"native:root"];
    [scoped openAppWithAppName:@"shopping" scheme:@"granite://shopping" key:@"native:ignored" rootKey:nil];
    NSCAssert(sink.events.count == 1, @"openApp must remain idempotent");
    NSCAssert([sink.events[0][@"params"][@"key"] isEqual:@"native:A"], @"binding was lost");
    NSCAssert([sink.events[0][@"params"][@"rootKey"] isEqual:@"native:root"], @"root binding was lost");

    GraniteMicroFrontendSessionRegistration *legacy = [GraniteMicroFrontendRuntimeHost registerSession:@"legacy"];
    [legacy openAppWithAppName:@"price-mission" scheme:@"granite://price-mission"];
    NSCAssert(sink.events[1][@"params"][@"key"] == nil, @"legacy hosts must omit binding");
    NSCAssert(sink.events[1][@"params"][@"rootKey"] == nil, @"legacy hosts must omit root binding");
    [scoped invalidate];
    NSUInteger eventCount = sink.events.count;
    [scoped openAppWithAppName:@"shopping" scheme:@"granite://shopping" key:@"native:stale" rootKey:nil];
    NSCAssert(sink.events.count == eventCount, @"invalidated registration reopened");
    [legacy invalidate];
    [GraniteMicroFrontendRuntimeHost detachEventSink:sink];
    NSLog(@"SessionBindingTokenHarness PASS");
  }
  return 0;
}
