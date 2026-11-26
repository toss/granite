#import "GraniteMicroFrontendRuntimeHost+Internal.h"
#import <objc/runtime.h>
#import <TargetConditionals.h>

#if TARGET_OS_IOS || TARGET_OS_TV
#import <UIKit/UIKit.h>
#define GRANITE_MICRO_FRONTEND_HAS_UIKIT 1
#else
#define GRANITE_MICRO_FRONTEND_HAS_UIKIT 0
#endif

@class GraniteMicroFrontendSessionEntry;
@class GraniteMicroFrontendAwaitingUnmount;

static NSRecursiveLock *runtimeLock;
static NSMutableDictionary<NSString *, GraniteMicroFrontendSessionEntry *> *sessions;
static NSMutableArray<NSDictionary *> *pendingEvents;
static __weak id<GraniteMicroFrontendRuntimeEventSink> eventSink;
static BOOL isDeliveringEvents;
typedef void (^GraniteMicroFrontendUnmountHandler)(GraniteMicroFrontendSessionReleaseReason reason);
/// Closed sessions whose release waits for JavaScript's unmount report, keyed by session id.
static NSMutableDictionary<NSString *, GraniteMicroFrontendAwaitingUnmount *> *awaitingUnmounts;

GraniteMicroFrontendSessionReleaseReason const GraniteMicroFrontendSessionReleaseReasonUnmounted = @"unmounted";
GraniteMicroFrontendSessionReleaseReason const GraniteMicroFrontendSessionReleaseReasonTimeout = @"timeout";
GraniteMicroFrontendSessionReleaseReason const GraniteMicroFrontendSessionReleaseReasonRuntimeDetached =
    @"runtimeDetached";
GraniteMicroFrontendSessionReleaseReason const GraniteMicroFrontendSessionReleaseReasonNotOpened = @"notOpened";

static void GraniteMicroFrontendRequireMainThread(void) {
  if (!NSThread.isMainThread) {
    @throw [NSException exceptionWithName:NSInternalInconsistencyException
                                   reason:@"Session bindings must be used on the main thread"
                                 userInfo:nil];
  }
}

@interface GraniteMicroFrontendSessionEntry : NSObject
@property(nonatomic, copy) NSString *token;
@property(nonatomic, assign) BOOL opened;
@property(nonatomic, assign) BOOL isVisible;
@property(nonatomic, assign) BOOL closed;
@end

@implementation GraniteMicroFrontendSessionEntry
@end

/// The unmount handlers of one closed session, for the registration (`token`) that closed it.
@interface GraniteMicroFrontendAwaitingUnmount : NSObject
@property(nonatomic, copy) NSString *token;
@property(nonatomic, strong) NSMutableArray<GraniteMicroFrontendUnmountHandler> *handlers;
@end

@implementation GraniteMicroFrontendAwaitingUnmount
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
@property(nonatomic, assign) BOOL viewAppeared;
@property(nonatomic, assign) BOOL applicationForeground;
@property(nonatomic, assign) BOOL invalidated;
- (void)updateVisibility;
@end
#endif

@interface GraniteMicroFrontendRuntimeHost ()
+ (void)drainEventsToSink:(id<GraniteMicroFrontendRuntimeEventSink>)sink;
+ (void)releaseSession:(NSString *)sessionId reason:(GraniteMicroFrontendSessionReleaseReason)reason;
@end

@implementation GraniteMicroFrontendSessionRegistration

- (void)openAppWithAppName:(NSString *)appName scheme:(NSString *)scheme {
  NSParameterAssert(appName.length > 0);
  NSParameterAssert(scheme.length > 0);
  BOOL shouldEmit = NO;
  [runtimeLock lock];
  @try {
    GraniteMicroFrontendSessionEntry *entry = sessions[_sessionId];
    if ([entry.token isEqualToString:_token] && !entry.opened && !entry.closed) {
      entry.opened = YES;
      shouldEmit = YES;
    }
  } @finally {
    [runtimeLock unlock];
  }
  if (shouldEmit) {
    [GraniteMicroFrontendRuntimeHost emitOpenApp:_sessionId appName:appName scheme:scheme];
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
    }
  } @finally {
    [runtimeLock unlock];
  }
  if (shouldEmit) {
    [GraniteMicroFrontendRuntimeHost emitSessionVisibilityChanged:_sessionId
                                                        isVisible:isVisible];
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
    }
  } @finally {
    [runtimeLock unlock];
  }
  if (shouldEmit) {
    [GraniteMicroFrontendRuntimeHost emitCloseApp:_sessionId];
  }
  return shouldEmit;
}

- (BOOL)closeAppWithUnmountTimeout:(NSTimeInterval)timeout
                         onUnmount:(void (^)(GraniteMicroFrontendSessionReleaseReason reason))onUnmount {
  NSParameterAssert(onUnmount != nil);
  BOOL shouldEmit = NO;
  BOOL joinedAwaitingUnmount = NO;
  NSString *sessionId = _sessionId;
  [runtimeLock lock];
  @try {
    GraniteMicroFrontendAwaitingUnmount *awaiting = awaitingUnmounts[sessionId];
    GraniteMicroFrontendSessionEntry *entry = sessions[sessionId];
    if ([awaiting.token isEqualToString:_token]) {
      // closeApp already went out and its unmount is still awaited: releasing now would cut off the cleanups that
      // are still running, so this handler waits for the same release.
      [awaiting.handlers addObject:[onUnmount copy]];
      joinedAwaitingUnmount = YES;
    } else if ([entry.token isEqualToString:_token] && entry.opened && !entry.closed) {
      entry.closed = YES;
      shouldEmit = YES;
      // Registered before the event goes out, so a fast report cannot arrive first.
      GraniteMicroFrontendAwaitingUnmount *newAwaiting = [[GraniteMicroFrontendAwaitingUnmount alloc] init];
      newAwaiting.token = _token;
      newAwaiting.handlers = [NSMutableArray arrayWithObject:[onUnmount copy]];
      awaitingUnmounts[sessionId] = newAwaiting;
    }
  } @finally {
    [runtimeLock unlock];
  }
  if (joinedAwaitingUnmount) {
    return NO;
  }
  if (!shouldEmit) {
    dispatch_async(dispatch_get_main_queue(), ^{
      onUnmount(GraniteMicroFrontendSessionReleaseReasonNotOpened);
    });
    return NO;
  }
  [GraniteMicroFrontendRuntimeHost emitCloseApp:sessionId];
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(MAX(timeout, 0) * NSEC_PER_SEC)),
                 dispatch_get_main_queue(), ^{
                   [GraniteMicroFrontendRuntimeHost releaseSession:sessionId
                                                            reason:GraniteMicroFrontendSessionReleaseReasonTimeout];
                 });
  return YES;
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

- (void)viewWillAppear:(BOOL)animated {
  [super viewWillAppear:animated];
  _binding.viewAppeared = YES;
}

- (void)viewWillDisappear:(BOOL)animated {
  _binding.viewAppeared = NO;
  [super viewWillDisappear:animated];
}

- (void)dealloc {
  [_binding invalidate];
}

@end

@implementation GraniteMicroFrontendViewControllerSessionBinding

static char GraniteMicroFrontendViewControllerSessionBindingKey;

+ (nullable GraniteMicroFrontendViewControllerSessionBinding *)bindViewController:(UIViewController *)viewController
                                                                        sessionId:(NSString *)sessionId
                                                                          appName:(NSString *)appName
                                                                           scheme:(NSString *)scheme {
  GraniteMicroFrontendRequireMainThread();
  NSParameterAssert(viewController != nil);
  NSParameterAssert(sessionId.length > 0);
  NSParameterAssert(appName.length > 0);
  NSParameterAssert(scheme.length > 0);

  GraniteMicroFrontendViewControllerSessionBinding *existingBinding =
      objc_getAssociatedObject(viewController, &GraniteMicroFrontendViewControllerSessionBindingKey);
  if (existingBinding != nil) {
    return existingBinding;
  }

  GraniteMicroFrontendSessionRegistration *registration =
      [GraniteMicroFrontendRuntimeHost registerSession:sessionId];
  if (registration == nil) {
    return nil;
  }
  GraniteMicroFrontendViewControllerSessionBinding *binding =
      [[GraniteMicroFrontendViewControllerSessionBinding alloc] init];
  GraniteMicroFrontendSessionLifecycleObserverViewController *observer =
      [[GraniteMicroFrontendSessionLifecycleObserverViewController alloc] init];
  observer.binding = binding;
  binding.viewController = viewController;
  binding.registration = registration;
  binding.observer = observer;
  binding.applicationForeground =
      UIApplication.sharedApplication.applicationState != UIApplicationStateBackground;

  [NSNotificationCenter.defaultCenter addObserver:binding
                                         selector:@selector(applicationWillEnterForeground)
                                             name:UIApplicationWillEnterForegroundNotification
                                           object:nil];
  [NSNotificationCenter.defaultCenter addObserver:binding
                                         selector:@selector(applicationDidEnterBackground)
                                             name:UIApplicationDidEnterBackgroundNotification
                                           object:nil];

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
  [binding updateVisibility];
  return binding;
}

- (void)setViewAppeared:(BOOL)viewAppeared {
  if (_viewAppeared == viewAppeared) {
    return;
  }
  _viewAppeared = viewAppeared;
  [self updateVisibility];
}

- (void)setApplicationForeground:(BOOL)applicationForeground {
  if (_applicationForeground == applicationForeground) {
    return;
  }
  _applicationForeground = applicationForeground;
  [self updateVisibility];
}

- (void)applicationWillEnterForeground {
  self.applicationForeground = YES;
}

- (void)applicationDidEnterBackground {
  self.applicationForeground = NO;
}

- (void)updateVisibility {
  GraniteMicroFrontendRequireMainThread();
  BOOL invalidated = NO;
  @synchronized(self) {
    invalidated = _invalidated;
  }
  if (invalidated) {
    return;
  }
  [_registration setVisible:(_viewAppeared && _applicationForeground)];
}

- (void)invalidate {
  GraniteMicroFrontendRequireMainThread();
  @synchronized(self) {
    if (_invalidated) {
      return;
    }
    _invalidated = YES;
  }

  [NSNotificationCenter.defaultCenter removeObserver:self
                                                name:UIApplicationWillEnterForegroundNotification
                                              object:nil];
  [NSNotificationCenter.defaultCenter removeObserver:self
                                                name:UIApplicationDidEnterBackgroundNotification
                                              object:nil];

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

+ (nullable GraniteMicroFrontendViewControllerSessionBinding *)bindViewController:(UIViewController *)viewController
                                                                        sessionId:(NSString *)sessionId
                                                                          appName:(NSString *)appName
                                                                           scheme:(NSString *)scheme {
  NSParameterAssert(NO);
  return nil;
}

- (void)invalidate {
}

@end

#endif

@implementation GraniteMicroFrontendRuntimeHost

+ (void)initialize {
  if (self != GraniteMicroFrontendRuntimeHost.class) {
    return;
  }
  runtimeLock = [[NSRecursiveLock alloc] init];
  sessions = [[NSMutableDictionary alloc] init];
  pendingEvents = [[NSMutableArray alloc] init];
  awaitingUnmounts = [[NSMutableDictionary alloc] init];
}

+ (nullable GraniteMicroFrontendSessionRegistration *)registerSession:(NSString *)sessionId {
  NSParameterAssert(sessionId.length > 0);

  NSString *token = NSUUID.UUID.UUIDString;
  GraniteMicroFrontendSessionEntry *entry = [[GraniteMicroFrontendSessionEntry alloc] init];
  entry.token = token;

  [runtimeLock lock];
  if (sessions[sessionId] != nil) {
    [runtimeLock unlock];
    // Do not throw: Swift cannot catch NSException and a reuse race during
    // VC teardown would crash the host. Callers must use unique sessionIds and
    // invalidate the previous registration before reusing an id.
    return nil;
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
  id<GraniteMicroFrontendRuntimeEventSink> currentSink = sink;
  while (YES) {
    [runtimeLock lock];
    id<GraniteMicroFrontendRuntimeEventSink> activeSink = eventSink;
    if (activeSink == nil || pendingEvents.count == 0) {
      isDeliveringEvents = NO;
      [runtimeLock unlock];
      return;
    }
    currentSink = activeSink;
    NSDictionary *event = pendingEvents.firstObject;
    [runtimeLock unlock];

    @try {
      if (![currentSink enqueueRuntimeEvent:event]) {
        [runtimeLock lock];
        isDeliveringEvents = NO;
        id<GraniteMicroFrontendRuntimeEventSink> replacementSink = eventSink;
        BOOL shouldResumeWithReplacement =
            replacementSink != nil && replacementSink != currentSink && pendingEvents.count > 0;
        if (shouldResumeWithReplacement) {
          isDeliveringEvents = YES;
        }
        [runtimeLock unlock];
        if (shouldResumeWithReplacement) {
          [self drainEventsToSink:replacementSink];
        }
        return;
      }
      [runtimeLock lock];
      [pendingEvents removeObjectAtIndex:0];
      [runtimeLock unlock];
    } @catch (NSException *exception) {
      [runtimeLock lock];
      isDeliveringEvents = NO;
      id<GraniteMicroFrontendRuntimeEventSink> replacementSink = eventSink;
      BOOL shouldResumeWithReplacement =
          replacementSink != nil && replacementSink != currentSink && pendingEvents.count > 0;
      if (shouldResumeWithReplacement) {
        isDeliveringEvents = YES;
      }
      [runtimeLock unlock];
      if (shouldResumeWithReplacement) {
        [self drainEventsToSink:replacementSink];
      }
      @throw exception;
    }
  }
}

+ (void)detachEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)sink {
  NSArray<GraniteMicroFrontendUnmountHandler> *orphanedHandlers = nil;
  [runtimeLock lock];
  if (eventSink == sink) {
    eventSink = nil;
    // The runtime that would report these unmounts is gone.
    NSMutableArray<GraniteMicroFrontendUnmountHandler> *handlers = [NSMutableArray array];
    for (GraniteMicroFrontendAwaitingUnmount *awaiting in awaitingUnmounts.allValues) {
      [handlers addObjectsFromArray:awaiting.handlers];
    }
    orphanedHandlers = handlers;
    [awaitingUnmounts removeAllObjects];
  }
  [runtimeLock unlock];
  if (orphanedHandlers.count > 0) {
    dispatch_async(dispatch_get_main_queue(), ^{
      for (GraniteMicroFrontendUnmountHandler handler in orphanedHandlers) {
        handler(GraniteMicroFrontendSessionReleaseReasonRuntimeDetached);
      }
    });
  }
}

+ (void)sessionDidUnmount:(NSString *)sessionId {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self releaseSession:sessionId reason:GraniteMicroFrontendSessionReleaseReasonUnmounted];
  });
}

/// Main thread. Calls the session's unmount handlers once; later reasons find nothing.
+ (void)releaseSession:(NSString *)sessionId reason:(GraniteMicroFrontendSessionReleaseReason)reason {
  [runtimeLock lock];
  GraniteMicroFrontendAwaitingUnmount *awaiting = awaitingUnmounts[sessionId];
  [awaitingUnmounts removeObjectForKey:sessionId];
  [runtimeLock unlock];
  for (GraniteMicroFrontendUnmountHandler handler in awaiting.handlers) {
    handler(reason);
  }
}

+ (void)unregisterSession:(NSString *)sessionId token:(NSString *)token {
  [runtimeLock lock];
  if ([sessions[sessionId].token isEqualToString:token]) {
    [sessions removeObjectForKey:sessionId];
  }
  [runtimeLock unlock];
}

@end
