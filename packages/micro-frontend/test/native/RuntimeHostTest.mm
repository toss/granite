#import "GraniteMicroFrontendRuntimeHost+Internal.h"
@interface Sink : NSObject <GraniteMicroFrontendRuntimeEventSink>
@property NSMutableArray *events;
@end
@implementation Sink
- (BOOL)enqueueRuntimeEvent:(NSDictionary *)event { [_events addObject:event]; return YES; }
@end
int main() {
 @autoreleasepool {
  Sink *sink = [Sink new]; sink.events = [NSMutableArray new];
  [GraniteMicroFrontendRuntimeHost startEventDeliveryToEventSink:sink];
  auto a = [GraniteMicroFrontendRuntimeHost registerSession:@"a" executionId:@"lifetime-a"];
  auto b = [GraniteMicroFrontendRuntimeHost registerSession:@"b" executionId:@"lifetime-b"];
  [a openAppWithAppName:@"example" scheme:@"example://a"];
  [b openAppWithAppName:@"example" scheme:@"example://b"];
  [a closeApp]; [a invalidate];
  auto next = [GraniteMicroFrontendRuntimeHost registerSession:@"a" executionId:@"new-a"];
  [next openAppWithAppName:@"example" scheme:@"example://a"];
  assert([sink.events[0][@"params"][@"executionId"] isEqual:@"lifetime-a"]);
  assert([sink.events[1][@"params"][@"executionId"] isEqual:@"lifetime-b"]);
  assert([sink.events[2][@"params"][@"executionId"] isEqual:@"lifetime-a"]);
  assert([sink.events[3][@"params"][@"executionId"] isEqual:@"new-a"]);
  assert(![a closeApp]);
  auto legacy = [GraniteMicroFrontendRuntimeHost registerSession:@"legacy"];
  [legacy openAppWithAppName:@"example" scheme:@"example://legacy"];
  assert(sink.events[4][@"params"][@"executionId"] == nil);
  puts("PASS: iOS lifecycle execution identity, closed registration, replacement lifetime, legacy omission");
 }
}
