#pragma once
#import <UIKit/UIKit.h>
#include <react/renderer/components/GraniteMicroFrontendRuntimeSpec/Props.h>

@protocol RCTComponentViewProtocol
@end

@interface RCTViewComponentView : UIView <RCTComponentViewProtocol> {
@protected
  facebook::react::Props::Shared _props;
}
@property(nonatomic, copy) NSString *nativeId;
- (void)updateProps:(facebook::react::Props::Shared const &)props
          oldProps:(facebook::react::Props::Shared const &)oldProps;
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index;
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index;
- (void)prepareForRecycle;
@end
