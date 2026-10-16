#import "GranitePortalInitialContentView.h"
#import "PortalInitialContentMount.h"
#include <cstdlib>
#include <iostream>

using namespace facebook::react;

// React base behavior is stubbed; the component and ledger are compiled from production sources.
@implementation RCTViewComponentView
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps { _props = props; }
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index
{ [self insertSubview:child atIndex:index]; }
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index
{ [child removeFromSuperview]; }
- (void)prepareForRecycle
{
  for (UIView *child in [self.subviews copy]) [child removeFromSuperview];
  self.nativeId = nil;
  _props.reset();
}
@end

static void Check(BOOL condition, const char *message)
{
  if (!condition) {
    std::cerr << "FAIL: " << message << std::endl;
    std::exit(1);
  }
}

static void SetProps(GranitePortalInitialContentView *view, const std::string &key, int32_t revision)
{
  auto props = std::make_shared<GranitePortalInitialContentViewProps>();
  props->initialContentKey = key;
  props->initialContentRevision = revision;
  [view updateProps:props oldProps:nullptr];
}

static void Mount(GranitePortalInitialContentView *view, NSInteger number, ShadowViewMutation mutation)
{
  MountingTransaction transaction{11, number, {mutation}};
  SurfaceTelemetry telemetry;
  [view mountingTransactionWillMount:transaction withSurfaceTelemetry:telemetry];
  [view mountingTransactionDidMount:transaction withSurfaceTelemetry:telemetry];
}

int main()
{
  @autoreleasepool {
    GranitePortalInitialContentView *view = [[GranitePortalInitialContentView alloc] initWithFrame:CGRectZero];
    view.tag = 42;
    GranitePortalInitialContentMount *mount = nil;
    for (GranitePortalInitialContentMount *candidate in GranitePortalInitialContentMounts()) {
      if (candidate.view == view) mount = candidate;
    }
    Check(mount != nil, "production component registers its ledger");

    // Include multibyte UTF-8 and an embedded NUL; C-string conversion would truncate this key.
    const std::string key = std::string(u8"session/🌿") + '\0' + u8"/café";
    NSString *expected = [NSString stringWithFormat:@"session/🌿%C/café", (unichar)0];
    SetProps(view, key, 7);
    Check([mount matchesIdentity:expected revision:7], "UTF-8 props retain their full byte length");
    Check(![mount matchesCompletedIdentity:expected revision:7], "props alone do not acknowledge");
    view.nativeId = @"ordinary-view-id";
    Check([mount matchesIdentity:expected revision:7], "ordinary nativeId is independent");

    RCTViewComponentView *sentinel = [RCTViewComponentView new];
    sentinel.nativeId = @"granite:portal-mount-sentinel";
    [view mountChildComponentView:sentinel index:0];
    Check(mount.sentinel == sentinel && sentinel.superview == view, "production mountChild retains the sentinel");
    Mount(view, 1, {{100}, {101}, 102});
    Check(![mount matchesCompletedIdentity:expected revision:7], "unrelated transaction does not acknowledge");
    Mount(view, 2, {{0}, {43}, 42});
    Check([mount matchesCompletedIdentity:expected revision:7], "parent mutation acknowledges sentinel insertion");
    MountingTransaction unrelated{11, 3, {{{100}, {101}, 102}}};
    SurfaceTelemetry telemetry;
    [view mountingTransactionWillMount:unrelated withSurfaceTelemetry:telemetry];
    Check([mount matchesCompletedIdentity:expected revision:7], "unrelated willMount preserves acknowledgment");
    MountingTransaction update{11, 4, {{{42}, {42}, 0}}};
    [view mountingTransactionWillMount:update withSurfaceTelemetry:telemetry];
    Check(![mount matchesCompletedIdentity:expected revision:7], "matching willMount invalidates acknowledgment");
    [view mountingTransactionDidMount:update withSurfaceTelemetry:telemetry];
    Check([mount matchesCompletedIdentity:expected revision:7], "matching didMount acknowledges update");

    SetProps(view, key, 8);
    Check(![mount matchesCompletedIdentity:expected revision:8], "revision changes invalidate completion");
    Mount(view, 5, {{42}, {0}, 0});
    Check([mount matchesCompletedIdentity:expected revision:8], "old-child mutation is recognized");
    SetProps(view, "next", 8);
    Check(![mount matchesCompletedIdentity:@"next" revision:8], "key changes invalidate completion");
    Mount(view, 6, {{0}, {42}, 0});
    Check([mount matchesCompletedIdentity:@"next" revision:8], "new-child mutation is recognized");

    [view unmountChildComponentView:sentinel index:0];
    Check(mount.sentinel == nil && sentinel.superview == nil, "production unmountChild clears sentinel");
    Check(![mount matchesCompletedIdentity:@"next" revision:8], "sentinel removal invalidates completion");
    [view mountChildComponentView:sentinel index:0];
    Mount(view, 7, {{0}, {43}, 42});
    Check([mount matchesCompletedIdentity:@"next" revision:8], "reinsertion can complete in a new transaction");

    // Keep the old sentinel alive to catch failure to clear the weak reference on recycle.
    [view prepareForRecycle];
    Check(mount.requestKey == nil && mount.revision == 0 && mount.sentinel == nil, "recycle clears all private state");
    Check(![mount matchesCompletedIdentity:@"next" revision:8], "recycle clears prior completion");
    SetProps(view, "next", 8);
    Mount(view, 8, {{0}, {42}, 0});
    Check(![mount matchesCompletedIdentity:@"next" revision:8], "reused identity cannot use the old sentinel");
    RCTViewComponentView *replacement = [RCTViewComponentView new];
    replacement.nativeId = sentinel.nativeId;
    [view mountChildComponentView:replacement index:0];
    Check(![mount matchesCompletedIdentity:@"next" revision:8], "replacement awaits its transaction");
    Mount(view, 9, {{0}, {44}, 42});
    Check([mount matchesCompletedIdentity:@"next" revision:8], "recycled component completes with a new insertion");
    std::cout << "PASS: production initial-content props, mutations, children and recycling" << std::endl;
  }
  return 0;
}
