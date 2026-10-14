#import "GranitePortalInitialContentView.h"
#import "PortalInitialContentMount.h"
#import <react/renderer/components/GraniteMicroFrontendRuntimeSpec/ComponentDescriptors.h>
#import <react/renderer/components/GraniteMicroFrontendRuntimeSpec/Props.h>

using namespace facebook::react;

static BOOL GraniteTransactionMutatesMarker(const MountingTransaction &transaction, NSInteger tag)
{
  for (const auto &mutation : transaction.getMutations()) {
    if (mutation.oldChildShadowView.tag == tag || mutation.newChildShadowView.tag == tag ||
        mutation.parentTag == tag) return YES;
  }
  return NO;
}

@implementation GranitePortalInitialContentView {
  GranitePortalInitialContentMount *_mount;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<GranitePortalInitialContentViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const GranitePortalInitialContentViewProps>();
    _props = defaultProps;
    _mount = [[GranitePortalInitialContentMount alloc] initWithView:self];
  }
  return self;
}

- (void)mountingTransactionWillMount:(const MountingTransaction &)transaction
              withSurfaceTelemetry:(const SurfaceTelemetry &)surfaceTelemetry
{
  if (GraniteTransactionMutatesMarker(transaction, self.tag)) [_mount willMount];
}

- (void)mountingTransactionDidMount:(const MountingTransaction &)transaction
             withSurfaceTelemetry:(const SurfaceTelemetry &)surfaceTelemetry
{
  if (GraniteTransactionMutatesMarker(transaction, self.tag)) {
    [_mount didMountWithSurfaceId:transaction.getSurfaceId() transaction:transaction.getNumber()];
  }
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  if ([childComponentView isKindOfClass:RCTViewComponentView.class] &&
      [((RCTViewComponentView *)childComponentView).nativeId isEqualToString:@"granite:portal-mount-sentinel"]) {
    _mount.sentinel = (RCTViewComponentView *)childComponentView;
  }
  [super mountChildComponentView:childComponentView index:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  if (childComponentView == _mount.sentinel) _mount.sentinel = nil;
  [super unmountChildComponentView:childComponentView index:index];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  GranitePortalInitialContentMountsChanged();
}

- (void)didMoveToSuperview
{
  [super didMoveToSuperview];
  GranitePortalInitialContentMountsChanged();
}

- (void)prepareForRecycle
{
  _mount.sentinel = nil;
  [super prepareForRecycle];
  GranitePortalInitialContentMountsChanged();
}

Class<RCTComponentViewProtocol> GranitePortalInitialContentViewCls(void)
{
  return GranitePortalInitialContentView.class;
}
@end
