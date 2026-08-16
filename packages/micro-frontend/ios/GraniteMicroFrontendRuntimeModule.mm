#import "GraniteMicroFrontendRuntimeModule.h"

#import "GraniteMicroFrontendRuntimeHost+Internal.h"
#import <React/RCTBridge.h>
#import <objc/runtime.h>
#import <React/RCTBridgeProxy+Cxx.h>
#import <React-callinvoker/ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

static NSString *const GraniteMicroFrontendRuntimeErrorDomain =
    @"GraniteMicroFrontendRuntime";

@interface RCTBridge (GraniteMicroFrontendRuntime)
- (void *)runtime;
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
@end

@interface GraniteMicroFrontendRuntimeModule () <GraniteMicroFrontendRuntimeEventSink>
@property(nonatomic, weak) RCTBridge *bridge;
- (BOOL)scheduleRuntimeEvent:(NSDictionary *)event;
@end

@implementation GraniteMicroFrontendRuntimeModule

RCT_EXPORT_MODULE(GraniteMicroFrontendRuntime)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (void)dealloc {
  [GraniteMicroFrontendRuntimeHost detachEventSink:self];
}

- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvokerIfAvailable {
  RCTBridge *bridge = self.bridge;
  if (bridge == nil) {
    return nullptr;
  }
  // Prefer the public CallInvoker on RCTBridge / bridge proxy without casting
  // to a concrete bridge subclass.
  return bridge.jsCallInvoker;
}

- (facebook::jsi::Runtime *)jsRuntimeIfAvailable {
  RCTBridge *bridge = self.bridge;
  // RCTBridgeProxy is an NSProxy, so respondsToSelector: is forwarded and
  // leaves the BOOL return buffer as NO even when runtime is implemented.
  // Probe the real class without going through message dispatch.
  if (bridge == nil ||
      !class_respondsToSelector(object_getClass(bridge), @selector(runtime))) {
    return nullptr;
  }
  return reinterpret_cast<facebook::jsi::Runtime *>(bridge.runtime);
}

- (void)evaluateScript:(JS::NativeGraniteMicroFrontendRuntime::EvaluateScriptRequest &)request
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
  NSString *filePath = request.filePath();
  if (![filePath isAbsolutePath]) {
    reject(@"INVALID_BUNDLE_PATH", @"Bundle path must be absolute", nil);
    return;
  }

  __weak GraniteMicroFrontendRuntimeModule *weakSelf = self;
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSError *readError = nil;
    NSData *scriptData = [NSData dataWithContentsOfFile:filePath
                                               options:NSDataReadingMappedIfSafe
                                                 error:&readError];
    if (scriptData == nil) {
      reject(@"BUNDLE_READ_FAILED", readError.localizedDescription, readError);
      return;
    }

    std::string source{static_cast<const char *>(scriptData.bytes), scriptData.length};
    std::string sourceUrl{[NSURL fileURLWithPath:filePath].absoluteString.UTF8String};
    GraniteMicroFrontendRuntimeModule *strongSelf = weakSelf;
    if (strongSelf == nil) {
      reject(@"RUNTIME_UNAVAILABLE", @"JavaScript runtime is unavailable", nil);
      return;
    }

    std::shared_ptr<facebook::react::CallInvoker> callInvoker =
        [strongSelf jsCallInvokerIfAvailable];
    if (callInvoker == nullptr) {
      reject(@"RUNTIME_UNAVAILABLE", @"JavaScript runtime is unavailable", nil);
      return;
    }

    // Read the JSI runtime only on the JS queue owned by callInvoker.
    callInvoker->invokeAsync([strongSelf,
                              source = std::move(source),
                              sourceUrl = std::move(sourceUrl),
                              resolve,
                              reject]() mutable {
      facebook::jsi::Runtime *runtime = [strongSelf jsRuntimeIfAvailable];
      if (runtime == nullptr) {
        reject(@"RUNTIME_UNAVAILABLE", @"JavaScript runtime is unavailable", nil);
        return;
      }
      try {
        runtime->evaluateJavaScript(
            std::make_unique<facebook::jsi::StringBuffer>(std::move(source)),
            sourceUrl);
        resolve(nil);
      } catch (const std::exception &exception) {
        NSString *message = [NSString stringWithUTF8String:exception.what()];
        NSError *error = [NSError errorWithDomain:GraniteMicroFrontendRuntimeErrorDomain
                                             code:500
                                         userInfo:@{ NSLocalizedDescriptionKey : message }];
        reject(@"EVALUATE_SCRIPT_FAILED", message, error);
      }
    });
  });
}

- (void)startEventDelivery {
  [GraniteMicroFrontendRuntimeHost startEventDeliveryToEventSink:self];
}

- (BOOL)enqueueRuntimeEvent:(NSDictionary *)event {
  return [self scheduleRuntimeEvent:event];
}

- (BOOL)scheduleRuntimeEvent:(NSDictionary *)event {
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
  return std::make_shared<facebook::react::NativeGraniteMicroFrontendRuntimeSpecJSI>(params);
}

@end
