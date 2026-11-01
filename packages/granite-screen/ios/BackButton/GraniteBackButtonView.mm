//
// GraniteBackButtonView.mm
// GraniteScreen
//
// Native view class around the iOS header back button from @granite-js/react-native
//

#import "GraniteBackButtonView.h"

#import <React/RCTComponentViewFactory.h>
#import <React/RCTViewComponentView.h>
#import <react/renderer/components/view/ConcreteViewShadowNode.h>
#import <react/renderer/core/ConcreteComponentDescriptor.h>

NSString *const GraniteBackButtonViewClassName = @"GraniteBackButtonView";

namespace facebook::react {

// GraniteScreen is not part of the host's codegen, so the view declares its descriptor itself.
// It only takes view props, which is what codegen would generate for it.
extern const char GraniteBackButtonViewComponentName[] = "GraniteBackButtonView";
using GraniteBackButtonViewShadowNode = ConcreteViewShadowNode<GraniteBackButtonViewComponentName, ViewProps>;
using GraniteBackButtonViewComponentDescriptor = ConcreteComponentDescriptor<GraniteBackButtonViewShadowNode>;

} // namespace facebook::react

using namespace facebook::react;

/// Plain container: the button inside it handles touches and accessibility.
@interface GraniteBackButtonView : RCTViewComponentView
@end

@implementation GraniteBackButtonView

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<GraniteBackButtonViewComponentDescriptor>();
}

@end

void GraniteRegisterBackButtonView(void)
{
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    [[RCTComponentViewFactory currentComponentViewFactory] registerComponentViewClass:[GraniteBackButtonView class]];
  });
}
