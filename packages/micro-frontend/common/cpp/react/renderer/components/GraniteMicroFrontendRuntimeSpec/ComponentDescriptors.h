#pragma once

// This header intentionally shares its path with the codegen-generated
// ComponentDescriptors.h and shadows it: common/cpp comes before the generated jni directory on
// the include path. React Native's generated autolinking.cpp includes this path and then names
// the descriptors listed in react-native.config.js, so both the custom Portal descriptors and
// the generated initial-content descriptor must be reachable through it. Renaming or removing this file breaks the consuming app's build with
// "use of undeclared identifier 'PortalViewComponentDescriptor'".

#include <react/renderer/components/GraniteMicroFrontendRuntimeSpec/ShadowNodes.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

#include <react/renderer/components/GraniteMicroFrontendRuntimeSpec/RNTPortalHostViewComponentDescriptor.h>
#include <react/renderer/components/GraniteMicroFrontendRuntimeSpec/RNTPortalViewComponentDescriptor.h>

#include <memory>

namespace facebook::react {

  using GranitePortalInitialContentViewComponentDescriptor =
      ConcreteComponentDescriptor<GranitePortalInitialContentViewShadowNode>;

  void GraniteMicroFrontendRuntimeSpec_registerComponentDescriptorsFromCodegen(
      std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);

} // namespace facebook::react
