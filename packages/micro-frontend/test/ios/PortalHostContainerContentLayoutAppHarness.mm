#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTRootComponentView.h>
#import <React/RCTSurfaceTouchHandler.h>

#import "PortalHostContainerView.h"
#import "PortalHostView.h"
#import "PortalInitialContentMount.h"

@implementation RCTViewComponentView
@end

@implementation RCTRootComponentView
@end

@implementation RCTSurfaceTouchHandler
- (instancetype)init
{
  if (self = [super initWithTarget:nil action:nil]) {
    self.delegate = self;
  }
  return self;
}
- (void)attachToView:(UIView *)view { [view addGestureRecognizer:self]; }
- (void)detachFromView:(UIView *)view { [view removeGestureRecognizer:self]; }
@end

@implementation PortalHostView
@synthesize onSubviewCountChanged;
- (void)setName:(nullable NSString *)name {}
- (NSInteger)nextInsertionIndexForChildAt:(NSInteger)childIndex { return childIndex; }
- (void)didAddSubview:(UIView *)subview
{
  [super didAddSubview:subview];
  if (self.onSubviewCountChanged) {
    self.onSubviewCountChanged();
  }
}
- (void)willRemoveSubview:(UIView *)subview
{
  [super willRemoveSubview:subview];
  if (!self.onSubviewCountChanged) {
    return;
  }
  __weak PortalHostView *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    PortalHostView *host = weakSelf;
    if (host.onSubviewCountChanged) {
      host.onSubviewCountChanged();
    }
  });
}
@end

static NSString *const ResultFileName = @"granite-portal-content-layout-results.json";
static NSString *ResultsPath(void) { return [NSTemporaryDirectory() stringByAppendingPathComponent:ResultFileName]; }

@interface TickWaiter : NSObject
@property (nonatomic) NSUInteger remaining;
@property (nonatomic, copy) dispatch_block_t block;
@property (nonatomic, strong) CADisplayLink *link;
@end

@implementation TickWaiter
- (instancetype)initWithTicks:(NSUInteger)ticks block:(dispatch_block_t)block
{
  if (self = [super init]) {
    _remaining = MAX(ticks, 1);
    _block = [block copy];
  }
  return self;
}
- (void)start
{
  self.link = [CADisplayLink displayLinkWithTarget:self selector:@selector(tick)];
  [self.link addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
}
- (void)tick
{
  if (--self.remaining > 0) {
    return;
  }
  [self.link invalidate];
  self.link = nil;
  dispatch_block_t block = self.block;
  self.block = nil;
  if (block) {
    block();
  }
}
@end

static void AfterTicks(NSUInteger count, dispatch_block_t block)
{
  TickWaiter *waiter = [[TickWaiter alloc] initWithTicks:count block:block];
  dispatch_async(dispatch_get_main_queue(), ^{
    [waiter start];
  });
}

static void AddNativeContent(UIView *view)
{
  [view addSubview:[[UIView alloc] initWithFrame:CGRectMake(0, 0, 64, 64)]];
}

// Drive the same ledger used by the Fabric component, with explicit transaction boundaries.
@interface HarnessMarker : RCTViewComponentView
@property (nonatomic, strong) GranitePortalInitialContentMount *mount;
@end
@implementation HarnessMarker
- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _mount = [[GranitePortalInitialContentMount alloc] initWithView:self];
    RCTViewComponentView *sentinel = [[RCTViewComponentView alloc] initWithFrame:CGRectZero];
    sentinel.nativeId = @"granite:portal-mount-sentinel";
    [self addSubview:sentinel];
    _mount.sentinel = sentinel;
  }
  return self;
}
- (void)didMoveToWindow { [super didMoveToWindow]; GranitePortalInitialContentMountsChanged(); }
- (void)didMoveToSuperview { [super didMoveToSuperview]; GranitePortalInitialContentMountsChanged(); }
@end

static void CompleteMarker(RCTViewComponentView *view)
{
  static NSInteger transaction = 0;
  GranitePortalInitialContentMount *mount = ((HarnessMarker *)view).mount;
  [mount willMount];
  [mount didMountWithSurfaceId:1 transaction:++transaction];
}

static RCTViewComponentView *Marker(NSString *requestKey, NSInteger revision, CGRect frame)
{
  RCTViewComponentView *view = [[HarnessMarker alloc] initWithFrame:frame];
  view.backgroundColor = UIColor.systemBlueColor;
  ((HarnessMarker *)view).mount.requestKey = requestKey;
  ((HarnessMarker *)view).mount.revision = revision;
  AddNativeContent(view);
  return view;
}

typedef void (^Done)(void);
typedef void (^Case)(Done done);

@interface Counter : NSObject
@property (nonatomic) NSUInteger value;
@end
@implementation Counter
@end

@interface Sentinel : NSObject
@end
@implementation Sentinel
@end

@interface Runner : NSObject
@property (nonatomic, strong) UIViewController *root;
@property (nonatomic, strong) UILabel *label;
@property (nonatomic, strong) NSMutableArray<NSDictionary *> *results;
@property (nonatomic, strong) NSMutableArray<NSString *> *failures;
@property (nonatomic, strong) NSMutableArray<id<PortalContentLayoutObservation>> *observations;
@property (nonatomic) BOOL finished;
@end

@implementation Runner
- (instancetype)initWithRoot:(UIViewController *)root label:(UILabel *)label
{
  if (self = [super init]) {
    _root = root;
    _label = label;
    _results = [NSMutableArray new];
    _failures = [NSMutableArray new];
    _observations = [NSMutableArray new];
  }
  return self;
}

- (void)run
{
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(8 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if (!self.finished) {
      [self fail:@"watchdog timeout" expected:@"finish" actual:@"pending"];
      [self finish];
    }
  });
  [self runCases:@[
    @{@"name" : @"exact marker", @"case" : [self exactCase]},
    @{@"name" : @"explicit declaration without visual heuristics", @"case" : [self descendantsCase]},
    @{@"name" : @"identity update", @"case" : [self identityUpdateCase]},
    @{@"name" : @"ordinary nativeId is independent", @"case" : [self viewIdentifierCase]},
    @{@"name" : @"mismatch and duplicate", @"case" : [self mismatchCase]},
    @{@"name" : @"physical subtree", @"case" : [self physicalSubtreeCase]},
    @{@"name" : @"mount generation and attachment", @"case" : [self layoutCase]},
    @{@"name" : @"lifecycle cancellation", @"case" : [self lifecycleCase]},
    @{@"name" : @"initial name preserves observation", @"case" : [self initialNameCase]},
    @{@"name" : @"deferred and late", @"case" : [self deferredLateCase]},
    @{@"name" : @"one-shot reentry", @"case" : [self reentryCase]},
    @{@"name" : @"sentinel removal", @"case" : [self sentinelRemovalCase]},
  ] index:0];
}

- (void)runCases:(NSArray<NSDictionary *> *)cases index:(NSUInteger)index
{
  if (index >= cases.count) {
    [self finish];
    return;
  }
  NSDictionary *entry = cases[index];
  NSUInteger failuresBefore = self.failures.count;
  ((Case)entry[@"case"])(^{
    [self.results addObject:@{@"name" : entry[@"name"], @"passed" : @(self.failures.count == failuresBefore)}];
    [self runCases:cases index:index + 1];
  });
}

- (void)expect:(NSUInteger)actual equals:(NSUInteger)expected name:(NSString *)name
{
  if (actual != expected) {
    [self fail:name expected:@(expected) actual:@(actual)];
  }
}
- (void)expectBool:(BOOL)condition name:(NSString *)name expected:(id)expected actual:(id)actual
{
  if (!condition) {
    [self fail:name expected:expected actual:actual];
  }
}
- (void)expectNil:(id)value name:(NSString *)name
{
  [self expectBool:value == nil name:name expected:@"nil" actual:value ?: @"not nil"];
}
- (void)fail:(NSString *)name expected:(id)expected actual:(id)actual
{
  NSString *message = [NSString stringWithFormat:@"%@ expected=%@ actual=%@", name, expected, actual];
  [self.failures addObject:message];
  [self.results addObject:@{@"name" : message, @"passed" : @NO, @"expected" : expected, @"actual" : actual}];
}

- (PortalHostContainerView *)container
{
  PortalHostContainerView *container = [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220)];
  [self.root.view addSubview:container];
  [container layoutIfNeeded];
  return container;
}
- (PortalHostView *)host:(PortalHostContainerView *)container
{
  [container activateIfNeeded];
  return (PortalHostView *)container.subviews.firstObject.subviews.firstObject;
}
- (void)observe:(PortalHostContainerView *)container counter:(Counter *)counter
{
  [self.observations addObject:[container observeContentLayoutWithRequestKey:@"request" revision:2 onReady:^{
                       counter.value++;
                     }]];
}
- (void)addReadyMarkerTo:(PortalHostView *)host
{
  RCTViewComponentView *marker = Marker(@"request", 2, CGRectMake(8, 8, 64, 64));
  [host addSubview:marker];
  CompleteMarker(marker);
  [host layoutIfNeeded];
}
- (void)close:(PortalHostContainerView *)container
{
  [container invalidate];
  [container removeFromSuperview];
}

- (Case)descendantsCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    HarnessMarker *marker = [[HarnessMarker alloc] initWithFrame:CGRectZero];
    ((HarnessMarker *)marker).mount.requestKey = @"request";
    ((HarnessMarker *)marker).mount.revision = 2;
    marker.hidden = YES;
    marker.alpha = 0;
    [[self host:container] addSubview:marker];
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    CompleteMarker(marker);
    AfterTicks(2, ^{
      [self expect:calls.value equals:1 name:@"explicit empty hidden zero-size content acknowledges mount"];
      [self close:container]; done();
    });
  } copy];
}

- (Case)exactCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    RCTViewComponentView *marker = Marker(@"request", 2, CGRectMake(8, 8, 64, 64));
    [[self host:container] addSubview:marker];
    [container layoutIfNeeded];
    AfterTicks(2, ^{
      [self expect:calls.value equals:0 name:@"layout and frames cannot acknowledge mount"];
      CompleteMarker(marker);
      AfterTicks(2, ^{
        [self expect:calls.value equals:1 name:@"mount completion delivers once"];
        CompleteMarker(marker);
        AfterTicks(2, ^{
          [self expect:calls.value equals:1 name:@"subsequent mount stays one-shot"];
          [self close:container]; done();
        });
      });
    });
  } copy];
}

- (Case)viewIdentifierCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    HarnessMarker *marker = (HarnessMarker *)Marker(@"other", 2, CGRectZero);
    marker.nativeId = @"granite:portal-initial-content:2:request";
    [[self host:container] addSubview:marker];
    CompleteMarker(marker);
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    AfterTicks(2, ^{
      [self expect:calls.value equals:0 name:@"nativeId cannot replace the internal identity"];
      marker.nativeId = @"external-id";
      marker.mount.requestKey = @"request";
      CompleteMarker(marker);
      AfterTicks(2, ^{
        [self expect:calls.value equals:1 name:@"internal identity completes with an unrelated nativeId"];
        [self close:container];
        done();
      });
    });
  } copy];
}

- (Case)identityUpdateCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    HarnessMarker *marker = (HarnessMarker *)Marker(@"old", 2, CGRectZero);
    [[self host:container] addSubview:marker];
    CompleteMarker(marker);
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    ((HarnessMarker *)marker).mount.requestKey = @"request";
    ((HarnessMarker *)marker).mount.revision = 2;
    AfterTicks(2, ^{
      [self expect:calls.value equals:0 name:@"new identity cannot reuse old acknowledgment"];
      CompleteMarker(marker);
      [marker.mount willMount];
      AfterTicks(2, ^{
        [self expect:calls.value equals:0 name:@"new transaction invalidates queued acknowledgment"];
        CompleteMarker(marker);
        AfterTicks(2, ^{
          [self expect:calls.value equals:1 name:@"matching completed generation delivers"];
          [self close:container]; done();
        });
      });
    });
  } copy];
}

- (Case)mismatchCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    RCTViewComponentView *marker = Marker(@"request", 3, CGRectZero);
    [[self host:container] addSubview:marker];
    CompleteMarker(marker);
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    AfterTicks(2, ^{
      [self expect:calls.value equals:0 name:@"revision mismatch stays pending"];
      ((HarnessMarker *)marker).mount.requestKey = @"request";
      ((HarnessMarker *)marker).mount.revision = 2;
      CompleteMarker(marker);
      RCTViewComponentView *duplicate = Marker(@"request", 2, CGRectZero);
      [[self host:container] addSubview:duplicate];
      AfterTicks(2, ^{
        [self expect:calls.value equals:0 name:@"uncommitted duplicate prevents ambiguous delivery"];
        [duplicate removeFromSuperview];
        AfterTicks(2, ^{
          [self expect:calls.value equals:1 name:@"unique completed identity delivers"];
          [self close:container]; done();
        });
      });
    });
  } copy];
}

- (Case)physicalSubtreeCase
{
  return [^(Done done) {
    PortalHostContainerView *direct = [self container];
    [direct addSubview:Marker(@"request", 2, CGRectMake(8, 8, 64, 64))];
    Counter *directCalls = [Counter new];
    [self observe:direct counter:directCalls];

    PortalHostContainerView *target = [self container];
    Counter *targetCalls = [Counter new];
    [self observe:target counter:targetCalls];
    UIWindow *otherWindow = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
    UIViewController *otherRoot = [UIViewController new];
    otherWindow.rootViewController = otherRoot;
    [otherWindow makeKeyAndVisible];
    PortalHostContainerView *other = [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220)];
    [otherRoot.view addSubview:other];
    [self addReadyMarkerTo:[self host:other]];

    AfterTicks(3, ^{
      [self expect:directCalls.value equals:0 name:@"marker outside inner host callback count"];
      [self expect:targetCalls.value equals:0 name:@"marker in other window callback count"];
      otherWindow.hidden = YES;
      [self close:direct];
      [self close:target];
      [self close:other];
      done();
    });
  } copy];
}

- (Case)layoutCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [[PortalHostContainerView alloc] initWithFrame:CGRectZero];
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    RCTViewComponentView *old = Marker(@"request", 2, CGRectZero);
    [[self host:container] addSubview:old];
    CompleteMarker(old);
    AfterTicks(2, ^{
      [self expect:calls.value equals:0 name:@"completed detached content waits for destination"];
      [old removeFromSuperview];
      RCTViewComponentView *replacement = Marker(@"request", 2, CGRectZero);
      [[self host:container] addSubview:replacement];
      [self.root.view addSubview:container];
      AfterTicks(2, ^{
        [self expect:calls.value equals:0 name:@"replacement instance needs its own completed mount"];
        CompleteMarker(replacement);
        AfterTicks(2, ^{
          [self expect:calls.value equals:1 name:@"attached replacement mount delivers"];
          [self close:container]; done();
        });
      });
    });
  } copy];
}

- (Case)lifecycleCase
{
  return [^(Done done) {
    NSMutableArray<PortalHostContainerView *> *containers = [NSMutableArray new];
    NSMutableDictionary<NSString *, Counter *> *counters = [NSMutableDictionary new];
    __weak PortalHostContainerView *weakActiveContainer = nil;
    __weak Sentinel *weakActiveSentinel = nil;
    NSArray<NSDictionary *> *cases = @[
      @{@"name" : @"explicit cancel", @"kind" : @"cancel"},
      @{@"name" : @"rename cancel", @"kind" : @"rename"},
      @{@"name" : @"clear name cancel", @"kind" : @"clearName"},
      @{@"name" : @"unchanged name preserves observation", @"kind" : @"sameName"},
      @{@"name" : @"invalidate cancel", @"kind" : @"invalidate"},
      @{@"name" : @"detach reattach cancel", @"kind" : @"detach"},
      @{@"name" : @"frame resize preserves observation", @"kind" : @"frame"},
      @{@"name" : @"bounds resize preserves observation", @"kind" : @"bounds"},
      @{@"name" : @"active dealloc cancel", @"kind" : @"activeDealloc"},
    ];

    for (NSDictionary *entry in cases) {
      PortalHostContainerView *container = [self container];
      [container setName:@"initial"];
      [containers addObject:container];
      Counter *calls = [Counter new];
      counters[entry[@"name"]] = calls;
      Sentinel *sentinel = [Sentinel new];
      id<PortalContentLayoutObservation> observation =
          [container observeContentLayoutWithRequestKey:@"request" revision:2 onReady:^{
            calls.value++;
            if ([entry[@"kind"] isEqualToString:@"activeDealloc"]) {
              (void)sentinel;
            }
          }];
      NSString *kind = entry[@"kind"];
      if ([kind isEqualToString:@"cancel"]) {
        [observation cancel];
      } else {
        [self.observations addObject:observation];
      }
      if ([kind isEqualToString:@"rename"]) {
        [container setName:@"other"];
      } else if ([kind isEqualToString:@"clearName"]) {
        [container setName:nil];
        [container setName:@"replacement"];
      } else if ([kind isEqualToString:@"sameName"]) {
        [container setName:@"initial"];
      } else if ([kind isEqualToString:@"invalidate"]) {
        [container invalidate];
      } else if ([kind isEqualToString:@"detach"]) {
        [container removeFromSuperview];
        [self.root.view addSubview:container];
      } else if ([kind isEqualToString:@"frame"]) {
        CGRect frame = container.frame;
        container.frame = CGRectMake(frame.origin.x, frame.origin.y, frame.size.width + 10, frame.size.height + 10);
        container.frame = frame;
      } else if ([kind isEqualToString:@"bounds"]) {
        CGRect bounds = container.bounds;
        container.bounds = CGRectMake(0, 0, bounds.size.width + 10, bounds.size.height + 10);
        container.bounds = bounds;
      } else if ([kind isEqualToString:@"activeDealloc"]) {
        weakActiveContainer = container;
        weakActiveSentinel = sentinel;
        [self addReadyMarkerTo:[self host:container]];
        [container removeFromSuperview];
        [containers removeObject:container];
        container = nil;
        continue;
      }
      [self addReadyMarkerTo:[self host:container]];
    }

    __weak PortalHostContainerView *weakContainer = nil;
    __weak Sentinel *weakSentinel = nil;
    __block NSUInteger deallocCalls = 0;
    @autoreleasepool {
      PortalHostContainerView *container =
          [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220) deferredActivation:YES];
      Sentinel *sentinel = [Sentinel new];
      weakContainer = container;
      weakSentinel = sentinel;
      [self.observations addObject:[container observeContentLayoutWithRequestKey:@"request" revision:2 onReady:^{
                           deallocCalls++;
                           (void)sentinel;
                         }]];
    }

    AfterTicks(3, ^{
      for (NSDictionary *entry in cases) {
        [self expect:counters[entry[@"name"]].value
              equals:([entry[@"kind"] isEqualToString:@"frame"] || [entry[@"kind"] isEqualToString:@"bounds"] ||
                      [entry[@"kind"] isEqualToString:@"sameName"]) ? 1 : 0
                name:[entry[@"name"] stringByAppendingString:@" callback count"]];
      }
      [self expectNil:weakActiveContainer name:@"active dealloc owner should release"];
      [self expectNil:weakActiveSentinel name:@"active dealloc should release callback capture"];
      [self expect:deallocCalls equals:0 name:@"dealloc callback count"];
      [self expectNil:weakContainer name:@"deallocated container should release"];
      [self expectNil:weakSentinel name:@"deallocated observation should release callback capture"];
      for (PortalHostContainerView *container in containers) {
        [self close:container];
      }
      done();
    });
  } copy];
}

- (Case)initialNameCase
{
  return [^(Done done) {
    PortalHostContainerView *deferred =
        [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220) deferredActivation:YES];
    Counter *deferredCalls = [Counter new];
    [self observe:deferred counter:deferredCalls];
    [deferred setName:@"initial"];
    [self expectBool:!deferred.isActivated name:@"naming must not activate the container"
            expected:@NO actual:@(deferred.isActivated)];
    [self.root.view addSubview:deferred];
    [self addReadyMarkerTo:[self host:deferred]];

    PortalHostContainerView *attached = [self container];
    Counter *attachedCalls = [Counter new];
    [self observe:attached counter:attachedCalls];
    [self addReadyMarkerTo:[self host:attached]];
    [attached setName:@"initial"];
    AfterTicks(3, ^{
      [self expect:deferredCalls.value equals:1 name:@"name after subscription before activation"];
      [self expect:attachedCalls.value equals:1 name:@"name after queued completion"];
      [self close:deferred];
      [self close:attached];
      done();
    });
  } copy];
}

- (Case)deferredLateCase
{
  return [^(Done done) {
    PortalHostContainerView *deferred =
        [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220) deferredActivation:YES];
    Counter *deferredCalls = [Counter new];
    [self observe:deferred counter:deferredCalls];
    [self expectBool:!deferred.isActivated
                name:@"subscription should not activate deferred container"
            expected:@NO
              actual:@(deferred.isActivated)];
    [self.root.view addSubview:deferred];
    [self addReadyMarkerTo:[self host:deferred]];

    PortalHostContainerView *late = [self container];
    [self addReadyMarkerTo:[self host:late]];
    Counter *lateCalls = [Counter new];
    AfterTicks(2, ^{
      [self observe:late counter:lateCalls];
      AfterTicks(3, ^{
        [self expect:deferredCalls.value equals:1 name:@"deferred activation callback count"];
        [self expect:lateCalls.value equals:1 name:@"late subscription callback count"];
        [self close:deferred];
        [self close:late];
        done();
      });
    });
  } copy];
}

- (Case)reentryCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    [self addReadyMarkerTo:[self host:container]];
    __block NSUInteger first = 0;
    __block NSUInteger second = 0;
    [self.observations addObject:[container observeContentLayoutWithRequestKey:@"request" revision:2 onReady:^{
                         first++;
                         [self.observations addObject:[container observeContentLayoutWithRequestKey:@"request"
                                                                                             revision:2
                                                                                              onReady:^{
                                                                                                second++;
                                                                                              }]];
                       }]];
    AfterTicks(4, ^{
      [self expect:first equals:1 name:@"reentrant first callback count"];
      [self expect:second equals:1 name:@"reentrant second callback count"];
      [self close:container];
      done();
    });
  } copy];
}

- (Case)sentinelRemovalCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    HarnessMarker *marker = (HarnessMarker *)Marker(@"request", 2, CGRectZero);
    [[self host:container] addSubview:marker];
    CompleteMarker(marker);
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    RCTViewComponentView *sentinel = marker.mount.sentinel;
    marker.mount.sentinel = nil;
    [sentinel removeFromSuperview];
    CompleteMarker(marker);
    AfterTicks(2, ^{
      [self expect:calls.value equals:0 name:@"removed sentinel cannot acknowledge mount"];
      [marker addSubview:sentinel];
      marker.mount.sentinel = sentinel;
      CompleteMarker(marker);
      AfterTicks(2, ^{
        [self expect:calls.value equals:1 name:@"new sentinel insertion may acknowledge mount"];
        [self close:container]; done();
      });
    });
  } copy];
}

- (void)finish
{
  if (self.finished) {
    return;
  }
  self.finished = YES;
  BOOL passed = self.failures.count == 0;
  NSDictionary *payload = @{
    @"passed" : @(passed),
    @"failureCount" : @(self.failures.count),
    @"results" : self.results,
  };
  NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:NSJSONWritingPrettyPrinted error:nil];
  NSString *path = ResultsPath();
  [data writeToFile:path atomically:YES];
  self.label.text = [NSString stringWithFormat:@"%@\n%@",
                                               passed ? [NSString stringWithFormat:@"PASS: %lu cases",
                                                                                  (unsigned long)self.results.count]
                                                      : [NSString stringWithFormat:@"FAILED: %@", self.failures.firstObject],
                                               path];
  self.label.textColor = passed ? UIColor.systemGreenColor : UIColor.systemRedColor;
  NSLog(@"GranitePortalContentLayoutHarness %@", self.label.text);
}
@end

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@property (nonatomic, strong) UIWindow *window;
@property (nonatomic, strong) Runner *runner;
@end

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
  UIViewController *root = [UIViewController new];
  root.view.backgroundColor = UIColor.whiteColor;
  UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(20, 40, 340, 120)];
  label.accessibilityIdentifier = @"granite-portal-content-layout-result";
  label.numberOfLines = 0;
  label.text = @"RUNNING";
  [root.view addSubview:label];
  self.window.rootViewController = root;
  [self.window makeKeyAndVisible];
  self.runner = [[Runner alloc] initWithRoot:root label:label];
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.runner run];
  });
  return YES;
}
@end

int main(int argc, char *argv[])
{
  @autoreleasepool {
    return UIApplicationMain(argc, argv, nil, NSStringFromClass(AppDelegate.class));
  }
}
