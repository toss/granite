#pragma once
#include <cstdint>
#include <memory>
#include <string>

// Input types only: production updateProps performs the conversion under test.
namespace facebook::react {
struct Props {
  using Shared = std::shared_ptr<const Props>;
  virtual ~Props() = default;
};
struct GranitePortalInitialContentViewProps : Props {
  std::string initialContentKey;
  int32_t initialContentRevision = 0;
};
}
