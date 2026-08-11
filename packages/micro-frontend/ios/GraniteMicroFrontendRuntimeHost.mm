#import "GraniteMicroFrontendRuntimeHost+Internal.h"
#import <objc/runtime.h>
#import <TargetConditionals.h>

#if TARGET_OS_IOS || TARGET_OS_TV
#import <UIKit/UIKit.h>
#define GRANITE_MICRO_FRONTEND_HAS_UIKIT 1
#else
#define GRANITE_MICRO_FRONTEND_HAS_UIKIT 0
#endif

static NSString *const GraniteMicroFrontendRuntimeErrorDomain =
    @"GraniteMicroFrontendRuntime";

@class GraniteMicroFrontendSessionEntry;

static NSRecursiveLock *runtimeLock;
static NSMutableDictionary<NSString *, GraniteMicroFrontendSessionEntry *> *sessions;
static NSMutableDictionary<NSString *, GraniteMicroFrontendPreloadCompletion> *preloadCompletions;
static NSMutableArray<NSDictionary *> *pendingEvents;
static __weak id<GraniteMicroFrontendRuntimeEventSink> eventSink;
static BOOL isDeliveringEvents;

static void GraniteMicroFrontendRequireMainThread(void) {
  if (!NSThread.isMainThread) {
    @throw [NSException exceptionWithName:NSInternalInconsistencyException
                                   reason:@"Session bindings must be used on the main thread"
                                 userInfo:nil];
  }
}

@interface GraniteMicroFrontendSessionEntry : NSObject
@property(nonatomic, copy) NSString *token;
@property(nonatomic, copy) dispatch_block_t closeHandler;
@property(nonatomic, assign) BOOL closeRequested;
@property(nonatomic, assign) BOOL opened;
@property(nonatomic, assign) BOOL isVisible;
@property(nonatomic, assign) BOOL closed;
@end

@implementation GraniteMicroFrontendSessionEntry
@end

@interface GraniteMicroFrontendSessionRegistration ()
@property(nonatomic, copy) NSString *sessionId;
@property(nonatomic, copy) NSString *token;
@property(nonatomic, assign) BOOL invalidated;
@end

@class GraniteMicroFrontendSessionLifecycleObserverViewController;

#if GRANITE_MICRO_FRONTEND_HAS_UIKIT
@interface GraniteMicroFrontendViewControllerSessionBinding ()
@property(nonatomic, weak) UIViewController *viewController;
@property(nonatomic, strong) GraniteMicroFrontendSessionRegistration *registration;
@property(nonatomic, strong) GraniteMicroFrontendSessionLifecycleObserverViewController *observer;
@property(nonatomic, assign) BOOL invalidated;
@end
#endif

@interface GraniteMicroFrontendPreloadRegistration ()
@property(nonatomic, copy) NSString *requestId;
@property(nonatomic, assign) BOOL invalidated;
@end

@interface GraniteMicroFrontendRuntimeHost ()
+ (void)drainEventsToSink:(id<GraniteMicroFrontendRuntimeEventSink>)sink;
@end

@implementation GraniteMicroFrontendSessionRegistration

- (void)openAppWithAppName:(NSString *)appName scheme:(NSString *)scheme {
  NSParameterAssert(appName.length > 0);
  NSParameterAssert(scheme.length > 0);
  [runtimeLock lock];
  @try {
    GraniteMicroFrontendSessionEntry *entry = sessions[_sessionId];
    if ([entry.token isEqualToString:_token] && !entry.opened && !entry.closed) {
      entry.opened = YES;
      [GraniteMicroFrontendRuntimeHost emitOpenApp:_sessionId appName:appName scheme:scheme];
    }
  } @finally {
    [runtimeLock unlock];
  }
}

- (BOOL)setVisible:(BOOL)isVisible {
  BOOL shouldEmit = NO;
  [runtimeLock lock];
  @try {
    GraniteMicroFrontendSessionEntry *entry = sessions[_sessionId];
    if ([entry.token isEqualToString:_token] && entry.opened && !entry.closed &&
        entry.isVisible != isVisible) {
      entry.isVisible = isVisible;
      shouldEmit = YES;
      [GraniteMicroFrontendRuntimeHost emitSessionVisibilityChanged:_sessionId
                                                          isVisible:isVisible];
    }
  } @finally {
    [runtimeLock unlock];
  }
  return shouldEmit;
}

- (BOOL)closeApp {
  BOOL shouldEmit = NO;
  [runtimeLock lock];
  @try {
    GraniteMicroFrontendSessionEntry *entry = sessions[_sessionId];
    if ([entry.token isEqualToString:_token] && entry.opened && !entry.closed) {
      entry.closed = YES;
      shouldEmit = YES;
      [GraniteMicroFrontendRuntimeHost emitCloseApp:_sessionId];
    }
  } @finally {
    [runtimeLock unlock];
  }
  return shouldEmit;
}

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

#if GRANITE_MICRO_FRONTEND_HAS_UIKIT

@interface GraniteMicroFrontendSessionLifecycleObserverViewController : UIViewController
@property(nonatomic, weak) GraniteMicroFrontendViewControllerSessionBinding *binding;
@end

@implementation GraniteMicroFrontendSessionLifecycleObserverViewController

- (void)viewDidAppear:(BOOL)animated {
  [super viewDidAppear:animated];
  [_binding.registration setVisible:YES];
}

- (void)viewDidDisappear:(BOOL)animated {
  [_binding.registration setVisible:NO];
  [super viewDidDisappear:animated];
}

- (void)dealloc {
  [_binding invalidate];
}

@end

@implementation GraniteMicroFrontendViewControllerSessionBinding

static char GraniteMicroFrontendViewControllerSessionBindingKey;

+ (GraniteMicroFrontendViewControllerSessionBinding *)bindViewController:(UIViewController *)viewController
                                                               sessionId:(NSString *)sessionId
                                                                 appName:(NSString *)appName
                                                                  scheme:(NSString *)scheme
                                                            closeHandler:(dispatch_block_t)closeHandler {
  GraniteMicroFrontendRequireMainThread();
  NSParameterAssert(viewController != nil);
  NSParameterAssert(sessionId.length > 0);
  NSParameterAssert(appName.length > 0);
  NSParameterAssert(scheme.length > 0);
  NSParameterAssert(closeHandler != nil);

  GraniteMicroFrontendViewControllerSessionBinding *existingBinding =
      objc_getAssociatedObject(viewController, &GraniteMicroFrontendViewControllerSessionBindingKey);
  if (existingBinding != nil) {
    return existingBinding;
  }

  GraniteMicroFrontendSessionRegistration *registration =
      [GraniteMicroFrontendRuntimeHost registerSession:sessionId closeHandler:closeHandler];
  GraniteMicroFrontendViewControllerSessionBinding *binding =
      [[GraniteMicroFrontendViewControllerSessionBinding alloc] init];
  GraniteMicroFrontendSessionLifecycleObserverViewController *observer =
      [[GraniteMicroFrontendSessionLifecycleObserverViewController alloc] init];
  observer.binding = binding;
  binding.viewController = viewController;
  binding.registration = registration;
  binding.observer = observer;

  [viewController addChildViewController:observer];
  observer.view.hidden = YES;
  observer.view.frame = CGRectZero;
  observer.view.userInteractionEnabled = NO;
  [viewController.view addSubview:observer.view];
  [observer didMoveToParentViewController:viewController];

  objc_setAssociatedObject(
      viewController,
      &GraniteMicroFrontendViewControllerSessionBindingKey,
      binding,
      OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  [registration openAppWithAppName:appName scheme:scheme];
  return binding;
}

- (void)invalidate {
  GraniteMicroFrontendRequireMainThread();
  @synchronized(self) {
    if (_invalidated) {
      return;
    }
    _invalidated = YES;
  }

  UIViewController *viewController = _viewController;
  _observer.binding = nil;
  if (_observer.parentViewController != nil) {
    [_observer willMoveToParentViewController:nil];
    [_observer.view removeFromSuperview];
    [_observer removeFromParentViewController];
  }
  [_registration closeApp];
  [_registration invalidate];
  if (viewController != nil &&
      objc_getAssociatedObject(viewController, &GraniteMicroFrontendViewControllerSessionBindingKey) == self) {
    objc_setAssociatedObject(
        viewController,
        &GraniteMicroFrontendViewControllerSessionBindingKey,
        nil,
        OBJC_ASSOCIATION_ASSIGN);
  }
}

- (void)dealloc {
  [self invalidate];
}

@end

#else

@implementation GraniteMicroFrontendViewControllerSessionBinding

+ (GraniteMicroFrontendViewControllerSessionBinding *)bindViewController:(UIViewController *)viewController
                                                               sessionId:(NSString *)sessionId
                                                                 appName:(NSString *)appName
                                                                  scheme:(NSString *)scheme
                                                            closeHandler:(dispatch_block_t)closeHandler {
  NSParameterAssert(NO);
  return [[GraniteMicroFrontendViewControllerSessionBinding alloc] init];
}

- (void)invalidate {
}

@end

#endif

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

+ (void)initialize {
  if (self != GraniteMicroFrontendRuntimeHost.class) {
    return;
  }
  runtimeLock = [[NSRecursiveLock alloc] init];
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
  if (sessions[sessionId] != nil) {
    [runtimeLock unlock];
    @throw [NSException exceptionWithName:NSInvalidArgumentException
                                   reason:[NSString stringWithFormat:
                                                       @"Session '%@' is already registered",
                                                       sessionId]
                                 userInfo:nil];
  }
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
  [pendingEvents addObject:event];
  id<GraniteMicroFrontendRuntimeEventSink> sink = eventSink;
  BOOL shouldDrain = sink != nil && !isDeliveringEvents;
  if (shouldDrain) {
    isDeliveringEvents = YES;
  }
  [runtimeLock unlock];
  if (shouldDrain) {
    [self drainEventsToSink:sink];
  }
}

+ (void)startEventDeliveryToEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)sink {
  [runtimeLock lock];
  if (eventSink != nil && eventSink != sink) {
    [runtimeLock unlock];
    return;
  }
  eventSink = sink;
  BOOL shouldDrain = !isDeliveringEvents && pendingEvents.count > 0;
  if (shouldDrain) {
    isDeliveringEvents = YES;
  }
  [runtimeLock unlock];
  if (shouldDrain) {
    [self drainEventsToSink:sink];
  }
}

+ (void)drainEventsToSink:(id<GraniteMicroFrontendRuntimeEventSink>)sink {
  while (YES) {
    [runtimeLock lock];
    if (eventSink != sink || pendingEvents.count == 0) {
      isDeliveringEvents = NO;
      [runtimeLock unlock];
      return;
    }
    NSDictionary *event = pendingEvents.firstObject;
    [pendingEvents removeObjectAtIndex:0];
    [runtimeLock unlock];

    @try {
      [sink enqueueRuntimeEvent:event];
    } @catch (NSException *exception) {
      [runtimeLock lock];
      isDeliveringEvents = NO;
      [runtimeLock unlock];
      @throw exception;
    }
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
