#import "RNComponentSessionsModule.h"

#import "RNComponentSessionStore.h"
#import <React/RCTBridge.h>
#import <React/RCTBridgeProxy+Cxx.h>
#import <React-callinvoker/ReactCommon/CallInvoker.h>

@interface RCTBridge (GraniteRNComponentView)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
@end

@interface RNComponentSessionsModule () <RNComponentEventSink>
@property(nonatomic, weak) RCTBridge *bridge;
@end

@implementation RNComponentSessionsModule

RCT_EXPORT_MODULE(GraniteRNComponentSessions)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)dealloc {
  [RNComponentSessionStore.sharedStore detachEventSink:self];
}

- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvokerIfAvailable {
  RCTBridge *bridge = self.bridge;
  if (bridge == nil) {
    return nullptr;
  }
  // Prefer the public CallInvoker on RCTBridge / bridge proxy without casting to a concrete bridge subclass.
  return bridge.jsCallInvoker;
}

- (void)startEventDelivery {
  [RNComponentSessionStore.sharedStore startDeliveryToEventSink:self];
}

- (void)reportContentSize:(JS::NativeGraniteRNComponentSessions::ReportContentSizeRequest &)request {
  [RNComponentSessionStore.sharedStore reportContentSize:CGSizeMake(request.width(), request.height())
                                               sessionId:request.sessionId()
                                           fromEventSink:self];
}

- (BOOL)enqueueEvent:(NSDictionary *)event {
  std::shared_ptr<facebook::react::CallInvoker> callInvoker = [self jsCallInvokerIfAvailable];
  if (callInvoker == nullptr) {
    return NO;
  }
  callInvoker->invokeAsync([self, event] {
    [self emitOnEvent:event];
  });
  return YES;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeGraniteRNComponentSessionsSpecJSI>(params);
}

@end
