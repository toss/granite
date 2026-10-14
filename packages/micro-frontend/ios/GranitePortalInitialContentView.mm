#import "GranitePortalInitialContentView.h"
#import "PortalInitialContentMount.h"
#import <react/renderer/components/GraniteMicroFrontendRuntimeSpec/ComponentDescriptors.h>
#import <react/renderer/components/GraniteMicroFrontendRuntimeSpec/Props.h>

using namespace facebook::react;

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

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  [_mount willMount];
  [super updateProps:props oldProps:oldProps];
}

- (void)mountingTransactionWillMount:(const MountingTransaction &)transaction
              withSurfaceTelemetry:(const SurfaceTelemetry &)surfaceTelemetry
{
  [_mount willMount];
}

- (void)mountingTransactionDidMount:(const MountingTransaction &)transaction
             withSurfaceTelemetry:(const SurfaceTelemetry &)surfaceTelemetry
{
  [_mount didMountWithSurfaceId:transaction.getSurfaceId() transaction:transaction.getNumber()];
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
  [_mount willMount];
  [super prepareForRecycle];
  GranitePortalInitialContentMountsChanged();
}

Class<RCTComponentViewProtocol> GranitePortalInitialContentViewCls(void)
{
  return GranitePortalInitialContentView.class;
}
@end
