#import "GraniteMicroFrontendRuntimeHost+Internal.h"

static NSString *const GraniteMicroFrontendRuntimeErrorDomain =
    @"GraniteMicroFrontendRuntime";

@interface GraniteMicroFrontendSessionEntry : NSObject
@property(nonatomic, copy) NSString *token;
@property(nonatomic, copy) dispatch_block_t closeHandler;
@property(nonatomic, assign) BOOL closeRequested;
@end

@implementation GraniteMicroFrontendSessionEntry
@end

@interface GraniteMicroFrontendSessionRegistration ()
@property(nonatomic, copy) NSString *sessionId;
@property(nonatomic, copy) NSString *token;
@property(nonatomic, assign) BOOL invalidated;
@end

@interface GraniteMicroFrontendPreloadRegistration ()
@property(nonatomic, copy) NSString *requestId;
@property(nonatomic, assign) BOOL invalidated;
@end

@implementation GraniteMicroFrontendSessionRegistration

- (void)invalidate {
  @synchronized(self) {
    if (_invalidated) {
      return;
    }
    _invalidated = YES;
  }
  [GraniteMicroFrontendRuntimeHost unregisterSession:_sessionId token:_token];
}

- (void)dealloc {
  [self invalidate];
}

@end

@implementation GraniteMicroFrontendPreloadRegistration

- (void)invalidate {
  @synchronized(self) {
    if (_invalidated) {
      return;
    }
    _invalidated = YES;
  }
  [GraniteMicroFrontendRuntimeHost cancelPreloadApp:_requestId];
}

- (void)dealloc {
  [self invalidate];
}

@end

@implementation GraniteMicroFrontendRuntimeHost

static NSLock *runtimeLock;
static NSMutableDictionary<NSString *, GraniteMicroFrontendSessionEntry *> *sessions;
static NSMutableDictionary<NSString *, GraniteMicroFrontendPreloadCompletion> *preloadCompletions;
static NSMutableArray<NSDictionary *> *pendingEvents;
static __weak id<GraniteMicroFrontendRuntimeEventSink> eventSink;

+ (void)initialize {
  if (self != GraniteMicroFrontendRuntimeHost.class) {
    return;
  }
  runtimeLock = [[NSLock alloc] init];
  sessions = [[NSMutableDictionary alloc] init];
  preloadCompletions = [[NSMutableDictionary alloc] init];
  pendingEvents = [[NSMutableArray alloc] init];
}

+ (GraniteMicroFrontendSessionRegistration *)registerSession:(NSString *)sessionId
                                                closeHandler:(dispatch_block_t)closeHandler {
  NSParameterAssert(sessionId.length > 0);
  NSParameterAssert(closeHandler != nil);

  NSString *token = NSUUID.UUID.UUIDString;
  GraniteMicroFrontendSessionEntry *entry = [[GraniteMicroFrontendSessionEntry alloc] init];
  entry.token = token;
  entry.closeHandler = closeHandler;

  [runtimeLock lock];
  NSAssert(sessions[sessionId] == nil, @"Session '%@' is already registered", sessionId);
  sessions[sessionId] = entry;
  [runtimeLock unlock];

  GraniteMicroFrontendSessionRegistration *registration =
      [[GraniteMicroFrontendSessionRegistration alloc] init];
  registration.sessionId = sessionId;
  registration.token = token;
  return registration;
}

+ (void)emitPreloadApp:(NSString *)appName {
  [self emitEvent:@{ @"name" : @"preloadApp", @"params" : @{ @"appName" : appName } }];
}

+ (GraniteMicroFrontendPreloadRegistration *)requestPreloadApp:(NSString *)appName
                                                   completion:(GraniteMicroFrontendPreloadCompletion)completion {
  NSParameterAssert(appName.length > 0);
  NSParameterAssert(completion != nil);
  NSString *requestId = NSUUID.UUID.UUIDString;
  [runtimeLock lock];
  preloadCompletions[requestId] = [completion copy];
  [runtimeLock unlock];

  [self emitEvent:@{
    @"name" : @"preloadApp",
    @"params" : @{ @"appName" : appName, @"requestId" : requestId },
  }];

  GraniteMicroFrontendPreloadRegistration *registration =
      [[GraniteMicroFrontendPreloadRegistration alloc] init];
  registration.requestId = requestId;
  return registration;
}

+ (void)emitOpenApp:(NSString *)sessionId
             appName:(NSString *)appName
              scheme:(NSString *)scheme {
  [self emitEvent:@{
    @"name" : @"openApp",
    @"params" : @{
      @"sessionId" : sessionId,
      @"appName" : appName,
      @"scheme" : scheme,
    },
  }];
}

+ (void)emitCloseApp:(NSString *)sessionId {
  [self emitEvent:@{ @"name" : @"closeApp", @"params" : @{ @"sessionId" : sessionId } }];
}

+ (void)emitSessionVisibilityChanged:(NSString *)sessionId
                           isVisible:(BOOL)isVisible {
  [self emitEvent:@{
    @"name" : @"sessionVisibilityChanged",
    @"params" : @{
      @"sessionId" : sessionId,
      @"isVisible" : @(isVisible),
    },
  }];
}

+ (void)emitEvent:(NSDictionary *)event {
  [runtimeLock lock];
  id<GraniteMicroFrontendRuntimeEventSink> sink = eventSink;
  if (sink == nil) {
    [pendingEvents addObject:event];
  }
  [runtimeLock unlock];
  [sink enqueueRuntimeEvent:event];
}

+ (void)startEventDeliveryToEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)sink {
  [runtimeLock lock];
  if (eventSink != nil && eventSink != sink) {
    [runtimeLock unlock];
    return;
  }
  eventSink = sink;
  NSArray<NSDictionary *> *events = [pendingEvents copy];
  [pendingEvents removeAllObjects];
  [runtimeLock unlock];

  for (NSDictionary *event in events) {
    [sink enqueueRuntimeEvent:event];
  }
}

+ (void)detachEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)sink {
  [runtimeLock lock];
  if (eventSink == sink) {
    eventSink = nil;
  }
  [runtimeLock unlock];
}

+ (BOOL)requestCloseSession:(NSString *)sessionId error:(NSError **)error {
  [runtimeLock lock];
  GraniteMicroFrontendSessionEntry *entry = sessions[sessionId];
  if (entry == nil) {
    [runtimeLock unlock];
    if (error != nil) {
      *error = [NSError errorWithDomain:GraniteMicroFrontendRuntimeErrorDomain
                                   code:404
                               userInfo:@{
                                 NSLocalizedDescriptionKey :
                                     [NSString stringWithFormat:
                                                   @"No native host is registered for session '%@'",
                                                   sessionId],
                               }];
    }
    return NO;
  }
  if (entry.closeRequested) {
    [runtimeLock unlock];
    return YES;
  }
  entry.closeRequested = YES;
  dispatch_block_t closeHandler = entry.closeHandler;
  [runtimeLock unlock];

  closeHandler();
  return YES;
}

+ (void)completePreloadApp:(NSString *)requestId errorMessage:(NSString *)errorMessage {
  [runtimeLock lock];
  GraniteMicroFrontendPreloadCompletion completion = preloadCompletions[requestId];
  [preloadCompletions removeObjectForKey:requestId];
  [runtimeLock unlock];
  if (completion == nil) {
    return;
  }

  NSError *error = errorMessage == nil
      ? nil
      : [NSError errorWithDomain:GraniteMicroFrontendRuntimeErrorDomain
                            code:500
                        userInfo:@{NSLocalizedDescriptionKey : errorMessage}];
  completion(error);
}

+ (void)cancelPreloadApp:(NSString *)requestId {
  [runtimeLock lock];
  [preloadCompletions removeObjectForKey:requestId];
  [runtimeLock unlock];
}

+ (void)unregisterSession:(NSString *)sessionId token:(NSString *)token {
  [runtimeLock lock];
  if ([sessions[sessionId].token isEqualToString:token]) {
    [sessions removeObjectForKey:sessionId];
  }
  [runtimeLock unlock];
}

@end
