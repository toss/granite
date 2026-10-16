#pragma once

namespace facebook::react {
struct ComponentDescriptorProvider {};
struct GranitePortalInitialContentViewComponentDescriptor {};
template <typename T> ComponentDescriptorProvider concreteComponentDescriptorProvider() { return {}; }
}
