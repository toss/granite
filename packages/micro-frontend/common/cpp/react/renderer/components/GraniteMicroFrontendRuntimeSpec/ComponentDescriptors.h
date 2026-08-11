#pragma once

#include <react/renderer/components/GraniteMicroFrontendRuntimeSpec/ShadowNodes.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

#include <react/renderer/components/GraniteMicroFrontendRuntimeSpec/RNTPortalHostViewComponentDescriptor.h>
#include <react/renderer/components/GraniteMicroFrontendRuntimeSpec/RNTPortalViewComponentDescriptor.h>

#include <memory>

namespace facebook::react {

  void GraniteMicroFrontendRuntimeSpec_registerComponentDescriptorsFromCodegen(
      std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);

} // namespace facebook::react
