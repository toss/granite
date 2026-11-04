#import <UIKit/UIKit.h>

@interface RCTSurfaceTouchHandler : UIGestureRecognizer <UIGestureRecognizerDelegate>
- (void)attachToView:(UIView *)view;
- (void)detachFromView:(UIView *)view;
@property (nonatomic, assign) CGPoint viewOriginOffset;
@end
