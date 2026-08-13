//
//  PortalRegistry.h
//  Pods
//
//  Created by Kiryl Ziusko on 04/09/2025.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@class PortalHostView;
@class PortalView;

/**
 * Main-thread-only registry that joins Portal destinations to Portal views.
 *
 * Multiple hosts may share one name; resolve prefers the last registered host in
 * the same window as the portal source, otherwise the last registered host that
 * still has a window.
 */
@interface PortalRegistry : NSObject

+ (instancetype)sharedInstance;

- (void)registerHost:(PortalHostView *)host withName:(NSString *)name;
- (void)unregisterHost:(PortalHostView *)host withName:(NSString *)name;
- (nullable PortalHostView *)resolveHostWithName:(nullable NSString *)name
                                      sourceView:(UIView *)sourceView;
- (void)notifyHostLayoutChangedWithName:(NSString *)name;

- (void)registerPendingPortal:(PortalView *)portal withHostName:(NSString *)hostName;
- (void)unregisterPendingPortal:(PortalView *)portal withHostName:(NSString *)hostName;

@end

NS_ASSUME_NONNULL_END
