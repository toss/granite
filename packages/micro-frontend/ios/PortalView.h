//
//  PortalView.h
//  Pods
//
//  Created by Kiryl Ziusko on 02/09/2025.
//

#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

#ifndef PortalViewNativeComponent_h
#define PortalViewNativeComponent_h

NS_ASSUME_NONNULL_BEGIN

/**
 * Fabric portal that reparents its React children under a named host.
 *
 * Child UIViewControllers under teleported content are reattached to the nearest
 * parent of the destination view when content moves. Hosts that do not own a
 * view controller will leave those children without a parent VC.
 */
@interface PortalView : RCTViewComponentView

- (void)onHostChanged;
- (void)onHostLayoutChanged;

@end

NS_ASSUME_NONNULL_END

#endif /* PortalViewNativeComponent_h */
