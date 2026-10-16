#pragma once
#import <Foundation/Foundation.h>
#include <vector>

namespace facebook::react {
struct ShadowView { NSInteger tag; };
struct ShadowViewMutation {
  ShadowView oldChildShadowView;
  ShadowView newChildShadowView;
  NSInteger parentTag;
};
struct MountingTransaction {
  NSInteger surfaceId;
  NSInteger number;
  std::vector<ShadowViewMutation> mutations;
  const auto &getMutations() const { return mutations; }
  NSInteger getSurfaceId() const { return surfaceId; }
  NSInteger getNumber() const { return number; }
};
struct SurfaceTelemetry {};
}

@protocol RCTMountingTransactionObserving
- (void)mountingTransactionWillMount:(const facebook::react::MountingTransaction &)transaction
              withSurfaceTelemetry:(const facebook::react::SurfaceTelemetry &)telemetry;
- (void)mountingTransactionDidMount:(const facebook::react::MountingTransaction &)transaction
             withSurfaceTelemetry:(const facebook::react::SurfaceTelemetry &)telemetry;
@end
