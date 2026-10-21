#import "RNComponentSessionStore.h"

NSNotificationName const RNComponentRendererDidChangeNotification = @"RNComponentRendererDidChangeNotification";

@interface RNComponentSessionEntry : NSObject
@property(nonatomic, copy) NSString *token;
@property(nonatomic, weak) RNComponentSessionRegistration *registration;
@property(nonatomic, assign) BOOL opened;
@property(nonatomic, copy) NSString *componentName;
@property(nonatomic, copy) NSDictionary<NSString *, id> *props;
@property(nonatomic, assign) RNComponentViewSizing sizing;
@property(nonatomic, copy, nullable) NSString *bundleFilePath;
@end

@implementation RNComponentSessionEntry
@end

static NSString *RNComponentViewSizingName(RNComponentViewSizing sizing) {
  switch (sizing) {
    case RNComponentViewSizingContentHeight:
      return @"contentHeight";
    case RNComponentViewSizingContentSize:
      return @"contentSize";
    case RNComponentViewSizingConstrained:
      return @"constrained";
  }
  return @"contentHeight";
}

static NSDictionary *RNComponentOpenEvent(NSString *sessionId, RNComponentSessionEntry *entry) {
  NSMutableDictionary *params = [@{
    @"sessionId" : sessionId,
    @"componentName" : entry.componentName,
    @"props" : entry.props,
    @"sizing" : RNComponentViewSizingName(entry.sizing),
  } mutableCopy];
  if (entry.bundleFilePath != nil) {
    params[@"bundleFilePath"] = entry.bundleFilePath;
  }
  return @{ @"name" : @"openComponent", @"params" : params };
}

static void RNComponentPostRendererDidChange(void) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [NSNotificationCenter.defaultCenter postNotificationName:RNComponentRendererDidChangeNotification object:nil];
  });
}

@interface RNComponentSessionRegistration ()
@property(nonatomic, strong) RNComponentSessionStore *store;
@property(nonatomic, copy) NSString *sessionId;
/// Identifies this registration in the store: a registration that deallocates reads as nil through a weak
/// reference, so the store compares tokens instead.
@property(nonatomic, copy) NSString *token;
@property(nonatomic, assign) BOOL invalidated;
- (void)deliverContentSize:(CGSize)contentSize;
@end

@interface RNComponentSessionStore ()
- (void)openComponentForRegistration:(RNComponentSessionRegistration *)registration
                       componentName:(NSString *)componentName
                               props:(NSDictionary<NSString *, id> *)props
                              sizing:(RNComponentViewSizing)sizing
                      bundleFilePath:(nullable NSString *)bundleFilePath;
- (BOOL)updatePropsForRegistration:(RNComponentSessionRegistration *)registration
                             props:(NSDictionary<NSString *, id> *)props;
- (void)closeSessionForRegistration:(RNComponentSessionRegistration *)registration;
@end

@implementation RNComponentSessionRegistration

- (void)openComponentWithName:(NSString *)componentName
                        props:(NSDictionary<NSString *, id> *)props
                       sizing:(RNComponentViewSizing)sizing
               bundleFilePath:(nullable NSString *)bundleFilePath {
  NSParameterAssert(componentName.length > 0);
  NSParameterAssert(props != nil);
  [_store openComponentForRegistration:self
                         componentName:componentName
                                 props:props
                                sizing:sizing
                        bundleFilePath:bundleFilePath];
}

- (BOOL)updateProps:(NSDictionary<NSString *, id> *)props {
  NSParameterAssert(props != nil);
  return [_store updatePropsForRegistration:self props:props];
}

- (void)invalidate {
  @synchronized(self) {
    if (_invalidated) {
      return;
    }
    _invalidated = YES;
  }
  [_store closeSessionForRegistration:self];
}

- (void)deliverContentSize:(CGSize)contentSize {
  @synchronized(self) {
    if (_invalidated) {
      return;
    }
  }
  void (^contentSizeHandler)(CGSize) = self.contentSizeHandler;
  if (contentSizeHandler != nil) {
    contentSizeHandler(contentSize);
  }
}

- (void)dealloc {
  [self invalidate];
}

@end

@implementation RNComponentSessionStore {
  NSRecursiveLock *_lock;
  NSMutableDictionary<NSString *, RNComponentSessionEntry *> *_sessions;
  /// Open order, so a starting renderer receives components in the order hosts opened them.
  NSMutableArray<NSString *> *_openedSessionIds;
  __weak id<RNComponentEventSink> _sink;
  /// Identity of the attached sink. A weak reference already reads nil while the sink deallocates, so
  /// detaching from its `-dealloc` compares this pointer instead.
  const void *_sinkIdentity;
}

+ (RNComponentSessionStore *)sharedStore {
  static RNComponentSessionStore *sharedStore;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedStore = [[RNComponentSessionStore alloc] init];
  });
  return sharedStore;
}

- (instancetype)init {
  if (self = [super init]) {
    _lock = [[NSRecursiveLock alloc] init];
    _sessions = [[NSMutableDictionary alloc] init];
    _openedSessionIds = [[NSMutableArray alloc] init];
  }
  return self;
}

- (nullable RNComponentSessionRegistration *)registerSession:(NSString *)sessionId {
  NSParameterAssert(sessionId.length > 0);

  NSString *token = NSUUID.UUID.UUIDString;
  RNComponentSessionRegistration *registration = [[RNComponentSessionRegistration alloc] init];
  registration.store = self;
  registration.sessionId = sessionId;
  registration.token = token;
  RNComponentSessionEntry *entry = [[RNComponentSessionEntry alloc] init];
  entry.token = token;
  entry.registration = registration;

  [_lock lock];
  if (_sessions[sessionId] != nil) {
    [_lock unlock];
    // The registration was never stored, so its dealloc must not unregister the existing session.
    registration.invalidated = YES;
    return nil;
  }
  _sessions[sessionId] = entry;
  [_lock unlock];
  return registration;
}

- (BOOL)isRendererAttached {
  [_lock lock];
  BOOL isAttached = _sink != nil;
  [_lock unlock];
  return isAttached;
}

- (void)startDeliveryToEventSink:(id<RNComponentEventSink>)sink {
  BOOL didAttach = NO;
  [_lock lock];
  @try {
    id<RNComponentEventSink> attachedSink = _sink;
    if (attachedSink != nil && attachedSink != sink) {
      return;
    }
    didAttach = attachedSink == nil;
    _sink = sink;
    _sinkIdentity = (__bridge const void *)sink;
    for (NSString *sessionId in _openedSessionIds) {
      [sink enqueueEvent:RNComponentOpenEvent(sessionId, _sessions[sessionId])];
    }
  } @finally {
    [_lock unlock];
  }
  if (didAttach) {
    RNComponentPostRendererDidChange();
  }
}

- (void)detachEventSink:(id)sink {
  BOOL didDetach = NO;
  [_lock lock];
  if (_sinkIdentity != NULL && _sinkIdentity == (__bridge const void *)sink) {
    _sink = nil;
    _sinkIdentity = NULL;
    didDetach = YES;
  }
  [_lock unlock];
  if (didDetach) {
    RNComponentPostRendererDidChange();
  }
}

- (void)reportContentSize:(CGSize)contentSize
                sessionId:(NSString *)sessionId
            fromEventSink:(id<RNComponentEventSink>)sink {
  if (!isfinite(contentSize.width) || !isfinite(contentSize.height) || contentSize.width < 0 ||
      contentSize.height < 0) {
    return;
  }
  RNComponentSessionRegistration *registration = nil;
  [_lock lock];
  if (_sinkIdentity == (__bridge const void *)sink) {
    RNComponentSessionEntry *entry = _sessions[sessionId];
    if (entry.opened) {
      registration = entry.registration;
    }
  }
  [_lock unlock];
  if (registration == nil) {
    return;
  }
  dispatch_async(dispatch_get_main_queue(), ^{
    [registration deliverContentSize:contentSize];
  });
}

#pragma mark - Registration

- (void)openComponentForRegistration:(RNComponentSessionRegistration *)registration
                       componentName:(NSString *)componentName
                               props:(NSDictionary<NSString *, id> *)props
                              sizing:(RNComponentViewSizing)sizing
                      bundleFilePath:(nullable NSString *)bundleFilePath {
  [_lock lock];
  @try {
    RNComponentSessionEntry *entry = [self entryForRegistration:registration];
    if (entry == nil || entry.opened) {
      return;
    }
    entry.opened = YES;
    entry.componentName = componentName;
    entry.props = props;
    entry.sizing = sizing;
    entry.bundleFilePath = bundleFilePath;
    [_openedSessionIds addObject:registration.sessionId];
    // Enqueue while holding the lock so this event and a starting renderer's snapshot keep their order.
    id<RNComponentEventSink> sink = _sink;
    [sink enqueueEvent:RNComponentOpenEvent(registration.sessionId, entry)];
  } @finally {
    [_lock unlock];
  }
}

- (BOOL)updatePropsForRegistration:(RNComponentSessionRegistration *)registration
                             props:(NSDictionary<NSString *, id> *)props {
  [_lock lock];
  @try {
    RNComponentSessionEntry *entry = [self entryForRegistration:registration];
    if (entry == nil || !entry.opened) {
      return NO;
    }
    entry.props = props;
    id<RNComponentEventSink> sink = _sink;
    [sink enqueueEvent:@{
      @"name" : @"updateComponentProps",
      @"params" : @{ @"sessionId" : registration.sessionId, @"props" : entry.props },
    }];
    return YES;
  } @finally {
    [_lock unlock];
  }
}

- (void)closeSessionForRegistration:(RNComponentSessionRegistration *)registration {
  [_lock lock];
  @try {
    RNComponentSessionEntry *entry = [self entryForRegistration:registration];
    if (entry == nil) {
      return;
    }
    [_sessions removeObjectForKey:registration.sessionId];
    if (!entry.opened) {
      return;
    }
    [_openedSessionIds removeObject:registration.sessionId];
    id<RNComponentEventSink> sink = _sink;
    [sink enqueueEvent:@{
      @"name" : @"closeComponent",
      @"params" : @{ @"sessionId" : registration.sessionId },
    }];
  } @finally {
    [_lock unlock];
  }
}

/// The entry of `registration`, not of a later registration that reuses its session id. Call with the lock held.
- (nullable RNComponentSessionEntry *)entryForRegistration:(RNComponentSessionRegistration *)registration {
  RNComponentSessionEntry *entry = _sessions[registration.sessionId];
  return [entry.token isEqualToString:registration.token] ? entry : nil;
}

@end
