#import "GraniteMicroFrontendRuntimeModule.h"

#import "GraniteMicroFrontendRuntimeHost+Internal.h"
#import <React/RCTBridge.h>
#import <React/RCTBridgeProxy+Cxx.h>
#import <React-callinvoker/ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

static NSString *const GraniteMicroFrontendRuntimeErrorDomain =
    @"GraniteMicroFrontendRuntime";

@interface RCTBridge (GraniteMicroFrontendRuntime)
- (void *)runtime;
@end

@interface GraniteMicroFrontendRuntimeModule () <GraniteMicroFrontendRuntimeEventSink>
@property(nonatomic, weak) RCTBridge *bridge;
@property(nonatomic, strong) NSLock *eventLock;
@property(nonatomic, strong) NSMutableArray<NSDictionary *> *pendingEvents;
@property(nonatomic, assign) BOOL eventDeliveryStarted;
@property(nonatomic, assign) BOOL isDeliveringEvents;
- (void)drainRuntimeEvents;
- (BOOL)scheduleRuntimeEvent:(NSDictionary *)event;
@end

@implementation GraniteMicroFrontendRuntimeModule

RCT_EXPORT_MODULE(GraniteMicroFrontendRuntime)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (instancetype)init {
  self = [super init];
  if (self != nil) {
    _eventLock = [[NSLock alloc] init];
    _pendingEvents = [[NSMutableArray alloc] init];
  }
  return self;
}

- (void)dealloc {
  [GraniteMicroFrontendRuntimeHost detachEventSink:self];
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
    RCTBridgeProxy *bridgeProxy = (RCTBridgeProxy *)strongSelf.bridge;
    std::shared_ptr<facebook::react::CallInvoker> callInvoker = bridgeProxy.jsCallInvoker;
    facebook::jsi::Runtime *runtime =
        reinterpret_cast<facebook::jsi::Runtime *>(strongSelf.bridge.runtime);
    if (callInvoker == nullptr || runtime == nullptr) {
      reject(@"RUNTIME_UNAVAILABLE", @"JavaScript runtime is unavailable", nil);
      return;
    }

    callInvoker->invokeAsync([source = std::move(source),
                              sourceUrl = std::move(sourceUrl),
                              runtime,
                              resolve,
                              reject]() mutable {
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

- (void)requestCloseSession:(JS::NativeGraniteMicroFrontendRuntime::CloseSessionRequest &)request
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
  NSString *sessionId = request.sessionId();
  dispatch_async(dispatch_get_main_queue(), ^{
    NSError *error = nil;
    if ([GraniteMicroFrontendRuntimeHost requestCloseSession:sessionId error:&error]) {
      resolve(nil);
    } else {
      reject(@"SESSION_NOT_FOUND", error.localizedDescription, error);
    }
  });
}

- (void)completePreloadApp:(JS::NativeGraniteMicroFrontendRuntime::CompletePreloadAppRequest &)request {
  [GraniteMicroFrontendRuntimeHost completePreloadApp:request.requestId()
                                         errorMessage:request.errorMessage()];
}

- (void)startEventDelivery {
  [_eventLock lock];
  if (_eventDeliveryStarted) {
    [_eventLock unlock];
    return;
  }
  _eventDeliveryStarted = YES;
  _isDeliveringEvents = YES;
  [_eventLock unlock];

  [GraniteMicroFrontendRuntimeHost startEventDeliveryToEventSink:self];
  [self drainRuntimeEvents];
}

- (void)enqueueRuntimeEvent:(NSDictionary *)event {
  [_eventLock lock];
  [_pendingEvents addObject:event];
  if (!_eventDeliveryStarted || _isDeliveringEvents) {
    [_eventLock unlock];
    return;
  }
  _isDeliveringEvents = YES;
  [_eventLock unlock];
  [self drainRuntimeEvents];
}

- (void)drainRuntimeEvents {
  while (YES) {
    [_eventLock lock];
    if (_pendingEvents.count == 0) {
      _isDeliveringEvents = NO;
      [_eventLock unlock];
      return;
    }
    NSDictionary *event = _pendingEvents.firstObject;
    [_pendingEvents removeObjectAtIndex:0];
    [_eventLock unlock];

    if (![self scheduleRuntimeEvent:event]) {
      [_eventLock lock];
      [_pendingEvents insertObject:event atIndex:0];
      _eventDeliveryStarted = NO;
      _isDeliveringEvents = NO;
      [_eventLock unlock];
      return;
    }
  }
}

- (BOOL)scheduleRuntimeEvent:(NSDictionary *)event {
  __weak GraniteMicroFrontendRuntimeModule *weakSelf = self;
  RCTBridgeProxy *bridgeProxy = (RCTBridgeProxy *)self.bridge;
  std::shared_ptr<facebook::react::CallInvoker> callInvoker = bridgeProxy.jsCallInvoker;
  if (callInvoker == nullptr) {
    return NO;
  }
  callInvoker->invokeAsync([weakSelf, event] {
    [weakSelf emitOnEvent:event];
  });
  return YES;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeGraniteMicroFrontendRuntimeSpecJSI>(params);
}

@end
