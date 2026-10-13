#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>
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

- (void)attachToView:(UIView *)view
{
  [view addGestureRecognizer:self];
}

- (void)detachFromView:(UIView *)view
{
  [view removeGestureRecognizer:self];
}
@end

@implementation PortalHostView
@synthesize onSubviewCountChanged;

- (void)setName:(nullable NSString *)name
{
}

- (NSInteger)nextInsertionIndexForChildAt:(NSInteger)childIndex
{
  return childIndex;
}

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
    PortalHostView *strongSelf = weakSelf;
    if (strongSelf.onSubviewCountChanged) {
      strongSelf.onSubviewCountChanged();
    }
  });
}
@end

static NSString *const GranitePortalHarnessResultFileName = @"granite-portal-content-layout-results.json";

static NSString *GranitePortalHarnessResultsPath(void)
{
  return [NSTemporaryDirectory() stringByAppendingPathComponent:GranitePortalHarnessResultFileName];
}

static NSString *GranitePortalMarkerID(NSString *requestKey, NSInteger revision)
{
  return [NSString stringWithFormat:@"granite:portal-initial-content:%ld:%@", (long)revision, requestKey];
}

static void GranitePortalAfterDisplayTicks(NSUInteger count, dispatch_block_t block);

@interface GranitePortalDisplayTickWaiter : NSObject
@property (nonatomic, assign) NSUInteger remainingTicks;
@property (nonatomic, copy) dispatch_block_t block;
@property (nonatomic, strong) CADisplayLink *displayLink;
@end

@implementation GranitePortalDisplayTickWaiter

- (instancetype)initWithTicks:(NSUInteger)ticks block:(dispatch_block_t)block
{
  if (self = [super init]) {
    _remainingTicks = MAX(ticks, 1);
    _block = [block copy];
  }
  return self;
}

- (void)start
{
  self.displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(tick)];
  [self.displayLink addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
}

- (void)tick
{
  self.remainingTicks--;
  if (self.remainingTicks > 0) {
    return;
  }
  [self.displayLink invalidate];
  self.displayLink = nil;
  dispatch_block_t block = self.block;
  self.block = nil;
  if (block) {
    block();
  }
}
@end

static void GranitePortalAfterDisplayTicks(NSUInteger count, dispatch_block_t block)
{
  GranitePortalDisplayTickWaiter *waiter = [[GranitePortalDisplayTickWaiter alloc] initWithTicks:count block:block];
  objc_setAssociatedObject(waiter, @selector(start), waiter, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  dispatch_async(dispatch_get_main_queue(), ^{
    [waiter start];
  });
}

static RCTViewComponentView *GranitePortalMarker(NSString *requestKey, NSInteger revision)
{
  RCTViewComponentView *marker = [[RCTViewComponentView alloc] initWithFrame:CGRectMake(8, 8, 64, 64)];
  marker.backgroundColor = UIColor.systemBlueColor;
  marker.nativeId = GranitePortalMarkerID(requestKey, revision);
  return marker;
}

@interface GranitePortalHarnessRunner : NSObject
@property (nonatomic, strong) UIWindow *window;
@property (nonatomic, strong) UIViewController *viewController;
@property (nonatomic, strong) UILabel *label;
@property (nonatomic, strong) NSMutableArray<NSDictionary *> *results;
@property (nonatomic, strong) NSMutableArray<NSString *> *failures;
@property (nonatomic, strong) NSMutableArray<id<PortalContentLayoutObservation>> *observations;
@end

typedef void (^GranitePortalHarnessDone)(void);
typedef void (^GranitePortalHarnessCase)(GranitePortalHarnessDone done);

@implementation GranitePortalHarnessRunner

- (instancetype)initWithWindow:(UIWindow *)window label:(UILabel *)label
{
  if (self = [super init]) {
    _window = window;
    _viewController = window.rootViewController;
    _label = label;
    _results = [NSMutableArray new];
    _failures = [NSMutableArray new];
    _observations = [NSMutableArray new];
  }
  return self;
}

- (void)run
{
  NSArray<NSDictionary *> *cases = @[
    @{@"name" : @"exact marker fires once", @"case" : [self exactMarkerFiresOnceCase]},
    @{@"name" : @"nativeId update marks existing view", @"case" : [self nativeIdUpdateCase]},
    @{@"name" : @"mismatched and duplicate markers stay pending", @"case" : [self mismatchCase]},
    @{@"name" : @"window and bounds gate readiness", @"case" : [self layoutGateCase]},
    @{@"name" : @"cancellation and lifecycle changes stop waiting", @"case" : [self cancellationCase]},
    @{@"name" : @"deferred activation and late subscription are live", @"case" : [self deferredAndLateCase]},
    @{@"name" : @"callback is one-shot and allows reentry", @"case" : [self reentryCase]},
  ];
  [self runCases:cases index:0];
}

- (void)runCases:(NSArray<NSDictionary *> *)cases index:(NSUInteger)index
{
  if (index >= cases.count) {
    [self finish];
    return;
  }

  NSDictionary *entry = cases[index];
  NSString *name = entry[@"name"];
  GranitePortalHarnessCase testCase = entry[@"case"];
  NSUInteger failureCountBeforeCase = self.failures.count;
  testCase(^{
    BOOL passed = self.failures.count == failureCountBeforeCase;
    [self.results addObject:@{@"name" : name, @"passed" : @(passed)}];
    [self runCases:cases index:index + 1];
  });
}

- (void)record:(BOOL)condition message:(NSString *)message expected:(id)expected actual:(id)actual
{
  if (condition) {
    return;
  }
  [self.failures addObject:[NSString stringWithFormat:@"%@ expected=%@ actual=%@", message, expected, actual]];
  [self.results addObject:@{
    @"name" : message,
    @"passed" : @NO,
    @"expected" : expected ?: [NSNull null],
    @"actual" : actual ?: [NSNull null],
  }];
}

- (PortalHostContainerView *)attachedContainer
{
  PortalHostContainerView *container =
      [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220)];
  [self.viewController.view addSubview:container];
  [self.viewController.view setNeedsLayout];
  [self.viewController.view layoutIfNeeded];
  [container layoutIfNeeded];
  return container;
}

- (PortalHostView *)hostViewForContainer:(PortalHostContainerView *)container activate:(BOOL)activate
{
  if (activate) {
    [container activateIfNeeded];
  }
  UIView *anchor = container.subviews.firstObject;
  return (PortalHostView *)anchor.subviews.firstObject;
}

- (void)removeContainer:(PortalHostContainerView *)container
{
  [container invalidate];
  [container removeFromSuperview];
}

- (GranitePortalHarnessCase)exactMarkerFiresOnceCase
{
  return [^(GranitePortalHarnessDone done) {
    PortalHostContainerView *container = [self attachedContainer];
    __block NSUInteger calls = 0;
    id<PortalContentLayoutObservation> observation =
        [container observeContentLayoutWithRequestKey:@"request" revision:2 onReady:^{
          calls++;
        }];
    [self.observations addObject:observation];

    PortalHostView *hostView = [self hostViewForContainer:container activate:YES];
    [hostView addSubview:GranitePortalMarker(@"request", 2)];
    [container layoutIfNeeded];
    [hostView layoutIfNeeded];

    GranitePortalAfterDisplayTicks(3, ^{
      [self record:calls == 1
           message:@"exact marker callback count"
          expected:@1
            actual:@(calls)];
      GranitePortalAfterDisplayTicks(2, ^{
        [self record:calls == 1
             message:@"exact marker callback should be one-shot"
            expected:@1
              actual:@(calls)];
        [self removeContainer:container];
        done();
      });
    });
  } copy];
}

- (GranitePortalHarnessCase)nativeIdUpdateCase
{
  return [^(GranitePortalHarnessDone done) {
    PortalHostContainerView *container = [self attachedContainer];
    PortalHostView *hostView = [self hostViewForContainer:container activate:YES];
    RCTViewComponentView *marker = [[RCTViewComponentView alloc] initWithFrame:CGRectMake(8, 8, 64, 64)];
    [hostView addSubview:marker];
    [container layoutIfNeeded];
    [hostView layoutIfNeeded];

    __block NSUInteger calls = 0;
    [self.observations addObject:[container observeContentLayoutWithRequestKey:@"request" revision:2 onReady:^{
                         calls++;
                       }]];

    GranitePortalAfterDisplayTicks(2, ^{
      [self record:calls == 0
           message:@"unmarked existing view should stay pending"
          expected:@0
            actual:@(calls)];
      marker.nativeId = GranitePortalMarkerID(@"request", 2);
      GranitePortalAfterDisplayTicks(3, ^{
        [self record:calls == 1
             message:@"nativeId update callback count"
            expected:@1
              actual:@(calls)];
        [self removeContainer:container];
        done();
      });
    });
  } copy];
}

- (GranitePortalHarnessCase)mismatchCase
{
  return [^(GranitePortalHarnessDone done) {
    PortalHostContainerView *wrongContainer = [self attachedContainer];
    PortalHostView *wrongHost = [self hostViewForContainer:wrongContainer activate:YES];
    [wrongHost addSubview:GranitePortalMarker(@"other", 2)];
    [wrongHost addSubview:GranitePortalMarker(@"request", 3)];
    __block NSUInteger wrongCalls = 0;
    [self.observations addObject:[wrongContainer observeContentLayoutWithRequestKey:@"request"
                                                                           revision:2
                                                                            onReady:^{
                                                                              wrongCalls++;
                                                                            }]];

    PortalHostContainerView *duplicateContainer = [self attachedContainer];
    PortalHostView *duplicateHost = [self hostViewForContainer:duplicateContainer activate:YES];
    [duplicateHost addSubview:GranitePortalMarker(@"request", 2)];
    [duplicateHost addSubview:GranitePortalMarker(@"request", 2)];
    __block NSUInteger duplicateCalls = 0;
    [self.observations addObject:[duplicateContainer observeContentLayoutWithRequestKey:@"request"
                                                                              revision:2
                                                                               onReady:^{
                                                                                 duplicateCalls++;
                                                                               }]];

    GranitePortalAfterDisplayTicks(3, ^{
      [self record:wrongCalls == 0
           message:@"wrong request or revision callback count"
          expected:@0
            actual:@(wrongCalls)];
      [self record:duplicateCalls == 0
           message:@"duplicate exact marker callback count"
          expected:@0
            actual:@(duplicateCalls)];
      [self removeContainer:wrongContainer];
      [self removeContainer:duplicateContainer];
      done();
    });
  } copy];
}

- (GranitePortalHarnessCase)layoutGateCase
{
  return [^(GranitePortalHarnessDone done) {
    PortalHostContainerView *container = [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220)];
    PortalHostView *hostView = [self hostViewForContainer:container activate:YES];
    [hostView addSubview:GranitePortalMarker(@"request", 2)];
    __block NSUInteger calls = 0;
    [self.observations addObject:[container observeContentLayoutWithRequestKey:@"request" revision:2 onReady:^{
                         calls++;
                       }]];

    GranitePortalAfterDisplayTicks(2, ^{
      [self record:calls == 0
           message:@"detached matching marker callback count"
          expected:@0
            actual:@(calls)];
      [self.viewController.view addSubview:container];
      [container layoutIfNeeded];
      [hostView layoutIfNeeded];
      GranitePortalAfterDisplayTicks(3, ^{
        [self record:calls == 1
             message:@"attached matching marker callback count"
            expected:@1
              actual:@(calls)];
        [self removeContainer:container];

        PortalHostContainerView *zeroContainer = [self attachedContainer];
        PortalHostView *zeroHost = [self hostViewForContainer:zeroContainer activate:YES];
        RCTViewComponentView *zeroMarker = GranitePortalMarker(@"request", 2);
        zeroMarker.frame = CGRectZero;
        [zeroHost addSubview:zeroMarker];
        __block NSUInteger zeroCalls = 0;
        [self.observations addObject:[zeroContainer observeContentLayoutWithRequestKey:@"request"
                                                                              revision:2
                                                                               onReady:^{
                                                                                 zeroCalls++;
                                                                               }]];
        GranitePortalAfterDisplayTicks(2, ^{
          [self record:zeroCalls == 0
               message:@"zero-bounds marker callback count"
              expected:@0
                actual:@(zeroCalls)];
          zeroMarker.frame = CGRectMake(8, 8, 64, 64);
          [zeroContainer layoutIfNeeded];
          [zeroHost layoutIfNeeded];
          GranitePortalAfterDisplayTicks(3, ^{
            [self record:zeroCalls == 1
                 message:@"positive-bounds marker callback count"
                expected:@1
                  actual:@(zeroCalls)];
            [self removeContainer:zeroContainer];
            done();
          });
        });
      });
    });
  } copy];
}

- (GranitePortalHarnessCase)cancellationCase
{
  return [^(GranitePortalHarnessDone done) {
    PortalHostContainerView *cancelledContainer = [self attachedContainer];
    __block NSUInteger cancelledCalls = 0;
    id<PortalContentLayoutObservation> cancelled =
        [cancelledContainer observeContentLayoutWithRequestKey:@"request" revision:2 onReady:^{
          cancelledCalls++;
        }];
    [cancelled cancel];
    [[self hostViewForContainer:cancelledContainer activate:YES] addSubview:GranitePortalMarker(@"request", 2)];

    PortalHostContainerView *renamedContainer = [self attachedContainer];
    __block NSUInteger renamedCalls = 0;
    [self.observations addObject:[renamedContainer observeContentLayoutWithRequestKey:@"request"
                                                                             revision:2
                                                                              onReady:^{
                                                                                renamedCalls++;
                                                                              }]];
    [renamedContainer setName:@"other"];
    [[self hostViewForContainer:renamedContainer activate:YES] addSubview:GranitePortalMarker(@"request", 2)];

    PortalHostContainerView *invalidatedContainer = [self attachedContainer];
    __block NSUInteger invalidatedCalls = 0;
    [self.observations addObject:[invalidatedContainer observeContentLayoutWithRequestKey:@"request"
                                                                                revision:2
                                                                                 onReady:^{
                                                                                   invalidatedCalls++;
                                                                                 }]];
    [invalidatedContainer invalidate];
    [[self hostViewForContainer:invalidatedContainer activate:YES] addSubview:GranitePortalMarker(@"request", 2)];

    PortalHostContainerView *detachedContainer = [self attachedContainer];
    __block NSUInteger detachedCalls = 0;
    [self.observations addObject:[detachedContainer observeContentLayoutWithRequestKey:@"request"
                                                                             revision:2
                                                                              onReady:^{
                                                                                detachedCalls++;
                                                                              }]];
    [detachedContainer removeFromSuperview];
    [[self hostViewForContainer:detachedContainer activate:YES] addSubview:GranitePortalMarker(@"request", 2)];

    PortalHostContainerView *resizedContainer = [self attachedContainer];
    __block NSUInteger resizedCalls = 0;
    [self.observations addObject:[resizedContainer observeContentLayoutWithRequestKey:@"request"
                                                                            revision:2
                                                                             onReady:^{
                                                                               resizedCalls++;
                                                                             }]];
    resizedContainer.frame = CGRectMake(20, 80, 260, 260);
    [[self hostViewForContainer:resizedContainer activate:YES] addSubview:GranitePortalMarker(@"request", 2)];

    GranitePortalAfterDisplayTicks(3, ^{
      [self record:cancelledCalls == 0
           message:@"explicit cancel callback count"
          expected:@0
            actual:@(cancelledCalls)];
      [self record:renamedCalls == 0
           message:@"rename cancel callback count"
          expected:@0
            actual:@(renamedCalls)];
      [self record:invalidatedCalls == 0
           message:@"invalidate cancel callback count"
          expected:@0
            actual:@(invalidatedCalls)];
      [self record:detachedCalls == 0
           message:@"detach cancel callback count"
          expected:@0
            actual:@(detachedCalls)];
      [self record:resizedCalls == 0
           message:@"resize cancel callback count"
          expected:@0
            actual:@(resizedCalls)];
      [self removeContainer:cancelledContainer];
      [self removeContainer:renamedContainer];
      [self removeContainer:invalidatedContainer];
      [self removeContainer:detachedContainer];
      [self removeContainer:resizedContainer];
      done();
    });
  } copy];
}

- (GranitePortalHarnessCase)deferredAndLateCase
{
  return [^(GranitePortalHarnessDone done) {
    PortalHostContainerView *deferredContainer =
        [[PortalHostContainerView alloc] initWithFrame:CGRectMake(20, 80, 220, 220) deferredActivation:YES];
    __block NSUInteger deferredCalls = 0;
    [self.observations addObject:[deferredContainer observeContentLayoutWithRequestKey:@"request"
                                                                              revision:2
                                                                               onReady:^{
                                                                                 deferredCalls++;
                                                                               }]];
    [self record:!deferredContainer.isActivated
         message:@"subscription should not activate deferred container"
        expected:@NO
          actual:@(deferredContainer.isActivated)];
    [self.viewController.view addSubview:deferredContainer];
    [deferredContainer activateIfNeeded];
    [[self hostViewForContainer:deferredContainer activate:NO] addSubview:GranitePortalMarker(@"request", 2)];

    PortalHostContainerView *lateContainer = [self attachedContainer];
    PortalHostView *lateHost = [self hostViewForContainer:lateContainer activate:YES];
    [lateHost addSubview:GranitePortalMarker(@"request", 2)];
    [lateContainer layoutIfNeeded];
    [lateHost layoutIfNeeded];
    __block NSUInteger lateCalls = 0;

    GranitePortalAfterDisplayTicks(2, ^{
      [self.observations addObject:[lateContainer observeContentLayoutWithRequestKey:@"request"
                                                                            revision:2
                                                                             onReady:^{
                                                                               lateCalls++;
                                                                             }]];
      GranitePortalAfterDisplayTicks(3, ^{
        [self record:deferredCalls == 1
             message:@"deferred activation callback count"
            expected:@1
              actual:@(deferredCalls)];
        [self record:lateCalls == 1
             message:@"late subscription callback count"
            expected:@1
              actual:@(lateCalls)];
        [self removeContainer:deferredContainer];
        [self removeContainer:lateContainer];
        done();
      });
    });
  } copy];
}

- (GranitePortalHarnessCase)reentryCase
{
  return [^(GranitePortalHarnessDone done) {
    PortalHostContainerView *container = [self attachedContainer];
    [[self hostViewForContainer:container activate:YES] addSubview:GranitePortalMarker(@"request", 2)];
    __block NSUInteger firstCalls = 0;
    __block NSUInteger secondCalls = 0;
    [self.observations addObject:[container observeContentLayoutWithRequestKey:@"request"
                                                                      revision:2
                                                                       onReady:^{
                                                                         firstCalls++;
                                                                         [self.observations
                                                                             addObject:[container
                                                                                           observeContentLayoutWithRequestKey:@"request"
                                                                                                                   revision:2
                                                                                                                    onReady:^{
                                                                                                                      secondCalls++;
                                                                                                                    }]];
                                                                       }]];

    GranitePortalAfterDisplayTicks(4, ^{
      [self record:firstCalls == 1
           message:@"reentrant first callback count"
          expected:@1
            actual:@(firstCalls)];
      [self record:secondCalls == 1
           message:@"reentrant second callback count"
          expected:@1
            actual:@(secondCalls)];
      [self removeContainer:container];
      done();
    });
  } copy];
}

- (void)finish
{
  BOOL passed = self.failures.count == 0;
  NSDictionary *payload = @{
    @"passed" : @(passed),
    @"failureCount" : @(self.failures.count),
    @"results" : self.results,
  };
  NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:NSJSONWritingPrettyPrinted error:nil];
  NSString *path = GranitePortalHarnessResultsPath();
  [data writeToFile:path atomically:YES];

  NSString *summary = passed ? [NSString stringWithFormat:@"PASS: %lu assertions", (unsigned long)self.results.count]
                             : [NSString stringWithFormat:@"FAILED: %@", self.failures.firstObject];
  self.label.text = [NSString stringWithFormat:@"%@\n%@", summary, path];
  self.label.textColor = passed ? UIColor.systemGreenColor : UIColor.systemRedColor;
  self.label.accessibilityIdentifier = @"granite-portal-content-layout-result";
  NSLog(@"GranitePortalContentLayoutHarness %@", self.label.text);
}
@end

@interface GranitePortalHarnessAppDelegate : UIResponder <UIApplicationDelegate>
@property (nonatomic, strong) UIWindow *window;
@property (nonatomic, strong) GranitePortalHarnessRunner *runner;
@end

@implementation GranitePortalHarnessAppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
  UIViewController *viewController = [UIViewController new];
  viewController.view.backgroundColor = UIColor.whiteColor;

  UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(20, 40, 340, 120)];
  label.numberOfLines = 0;
  label.text = @"RUNNING";
  label.accessibilityIdentifier = @"granite-portal-content-layout-result";
  [viewController.view addSubview:label];

  self.window.rootViewController = viewController;
  [self.window makeKeyAndVisible];

  self.runner = [[GranitePortalHarnessRunner alloc] initWithWindow:self.window label:label];
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.runner run];
  });
  return YES;
}
@end

int main(int argc, char *argv[])
{
  @autoreleasepool {
    return UIApplicationMain(argc, argv, nil, NSStringFromClass(GranitePortalHarnessAppDelegate.class));
  }
}
