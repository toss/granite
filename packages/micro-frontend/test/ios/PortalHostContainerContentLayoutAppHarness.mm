#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTRootComponentView.h>
#import <React/RCTSurfaceTouchHandler.h>

#import "PortalHostContainerView.h"
#import "PortalHostView.h"

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
static NSString *MarkerID(NSString *requestKey, NSInteger revision)
{
  return [NSString stringWithFormat:@"granite:portal-initial-content:%ld:%@", (long)revision, requestKey];
}

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

static RCTViewComponentView *Marker(NSString *requestKey, NSInteger revision, CGRect frame)
{
  RCTViewComponentView *view = [[RCTViewComponentView alloc] initWithFrame:frame];
  view.backgroundColor = UIColor.systemBlueColor;
  view.nativeId = MarkerID(requestKey, revision);
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

@interface PendingLayer : CALayer
@property (nonatomic) BOOL forceNeedsLayout;
@end
@implementation PendingLayer
- (BOOL)needsLayout { return self.forceNeedsLayout || [super needsLayout]; }
@end

@interface PendingMarker : RCTViewComponentView
@end
@implementation PendingMarker
+ (Class)layerClass { return PendingLayer.class; }
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
    @{@"name" : @"nativeId update", @"case" : [self nativeIdUpdateCase]},
    @{@"name" : @"mismatch and duplicate", @"case" : [self mismatchCase]},
    @{@"name" : @"physical subtree", @"case" : [self physicalSubtreeCase]},
    @{@"name" : @"layout and window gates", @"case" : [self layoutCase]},
    @{@"name" : @"lifecycle cancellation", @"case" : [self lifecycleCase]},
    @{@"name" : @"deferred and late", @"case" : [self deferredLateCase]},
    @{@"name" : @"one-shot reentry", @"case" : [self reentryCase]},
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
  [host addSubview:Marker(@"request", 2, CGRectMake(8, 8, 64, 64))];
  [host layoutIfNeeded];
}
- (void)close:(PortalHostContainerView *)container
{
  [container invalidate];
  [container removeFromSuperview];
}

- (Case)exactCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    [self addReadyMarkerTo:[self host:container]];
    AfterTicks(3, ^{
      [self expect:calls.value equals:1 name:@"exact marker callback count"];
      AfterTicks(2, ^{
        [self expect:calls.value equals:1 name:@"exact marker should be one-shot"];
        [self close:container];
        done();
      });
    });
  } copy];
}

- (Case)nativeIdUpdateCase
{
  return [^(Done done) {
    PortalHostContainerView *container = [self container];
    PortalHostView *host = [self host:container];
    RCTViewComponentView *marker = [[RCTViewComponentView alloc] initWithFrame:CGRectMake(8, 8, 64, 64)];
    [host addSubview:marker];
    [host layoutIfNeeded];
    Counter *calls = [Counter new];
    [self observe:container counter:calls];
    AfterTicks(2, ^{
      [self expect:calls.value equals:0 name:@"unmarked existing view should stay pending"];
      marker.nativeId = MarkerID(@"request", 2);
      AfterTicks(3, ^{
        [self expect:calls.value equals:1 name:@"nativeId update callback count"];
        [self close:container];
        done();
      });
    });
  } copy];
}

- (Case)mismatchCase
{
  return [^(Done done) {
    PortalHostContainerView *wrong = [self container];
    PortalHostView *wrongHost = [self host:wrong];
    [wrongHost addSubview:Marker(@"other", 2, CGRectMake(8, 8, 64, 64))];
    [wrongHost addSubview:Marker(@"request", 3, CGRectMake(8, 8, 64, 64))];
    Counter *wrongCalls = [Counter new];
    [self observe:wrong counter:wrongCalls];

    PortalHostContainerView *duplicate = [self container];
    PortalHostView *duplicateHost = [self host:duplicate];
    [duplicateHost addSubview:Marker(@"request", 2, CGRectMake(8, 8, 64, 64))];
    [duplicateHost addSubview:Marker(@"request", 2, CGRectMake(80, 8, 64, 64))];
    Counter *duplicateCalls = [Counter new];
    [self observe:duplicate counter:duplicateCalls];

    AfterTicks(3, ^{
      [self expect:wrongCalls.value equals:0 name:@"wrong request or revision callback count"];
      [self expect:duplicateCalls.value equals:0 name:@"duplicate marker callback count"];
      [self close:wrong];
      [self close:duplicate];
      done();
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
    PortalHostContainerView *detached = [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220)];
    [self addReadyMarkerTo:[self host:detached]];
    Counter *detachedCalls = [Counter new];
    [self observe:detached counter:detachedCalls];
    AfterTicks(2, ^{
      [self expect:detachedCalls.value equals:0 name:@"detached marker callback count"];
      [self.root.view addSubview:detached];
      [detached layoutIfNeeded];
      AfterTicks(3, ^{
        [self expect:detachedCalls.value equals:1 name:@"attached marker callback count"];
        [self close:detached];

        PortalHostContainerView *zero = [self container];
        PortalHostView *zeroHost = [self host:zero];
        RCTViewComponentView *marker = Marker(@"request", 2, CGRectZero);
        [zeroHost addSubview:marker];
        Counter *zeroCalls = [Counter new];
        [self observe:zero counter:zeroCalls];
        AfterTicks(2, ^{
          [self expect:zeroCalls.value equals:0 name:@"zero-bounds marker callback count"];
          marker.frame = CGRectMake(8, 8, 64, 64);
          [zeroHost layoutIfNeeded];
          AfterTicks(3, ^{
            [self expect:zeroCalls.value equals:1 name:@"positive-bounds marker callback count"];
            [self close:zero];

            PortalHostContainerView *pending = [self container];
            PortalHostView *pendingHost = [self host:pending];
            PendingMarker *pendingMarker = [PendingMarker new];
            pendingMarker.frame = CGRectMake(8, 8, 64, 64);
            pendingMarker.nativeId = MarkerID(@"request", 2);
            ((PendingLayer *)pendingMarker.layer).forceNeedsLayout = YES;
            [pendingHost addSubview:pendingMarker];
            Counter *pendingCalls = [Counter new];
            [self observe:pending counter:pendingCalls];
            AfterTicks(2, ^{
              [self expect:pendingCalls.value equals:0 name:@"pending marker layer callback count"];
              ((PendingLayer *)pendingMarker.layer).forceNeedsLayout = NO;
              [pendingMarker setNeedsLayout];
              [pendingMarker layoutIfNeeded];
              AfterTicks(3, ^{
                [self expect:pendingCalls.value equals:1 name:@"settled marker layer callback count"];
                [self close:pending];
                done();
              });
            });
          });
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
      @{@"name" : @"invalidate cancel", @"kind" : @"invalidate"},
      @{@"name" : @"detach reattach cancel", @"kind" : @"detach"},
      @{@"name" : @"frame resize revert cancel", @"kind" : @"frame"},
      @{@"name" : @"bounds resize revert cancel", @"kind" : @"bounds"},
      @{@"name" : @"active dealloc cancel", @"kind" : @"activeDealloc"},
    ];

    for (NSDictionary *entry in cases) {
      PortalHostContainerView *container = [self container];
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
              equals:0
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
