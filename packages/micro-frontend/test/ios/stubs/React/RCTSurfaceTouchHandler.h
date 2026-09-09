#import <UIKit/UIKit.h>

@interface RCTSurfaceTouchHandler : UIGestureRecognizer <UIGestureRecognizerDelegate>
- (void)attachToView:(UIView *)view;
- (void)detachFromView:(UIView *)view;
@end
