#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class UIViewController;

@interface GraniteMicroFrontendSessionRegistration : NSObject
- (void)openAppWithAppName:(NSString *)appName scheme:(NSString *)scheme;
- (BOOL)setVisible:(BOOL)isVisible;
- (BOOL)closeApp;
- (void)invalidate;
@end

@interface GraniteMicroFrontendViewControllerSessionBinding : NSObject
/// Returns an existing binding if this view controller is already bound.
/// Returns `nil` if `sessionId` is already registered on another container.
+ (nullable GraniteMicroFrontendViewControllerSessionBinding *)bindViewController:(UIViewController *)viewController
                                                                        sessionId:(NSString *)sessionId
                                                                          appName:(NSString *)appName
                                                                           scheme:(NSString *)scheme;
- (void)invalidate;
@end

@interface GraniteMicroFrontendRuntimeHost : NSObject

/// Registers a session. Returns `nil` if `sessionId` is already registered.
/// Callers must use a unique id per destination and invalidate before reuse.
+ (nullable GraniteMicroFrontendSessionRegistration *)registerSession:(NSString *)sessionId;

+ (void)emitPreloadApp:(NSString *)appName;

@end

NS_ASSUME_NONNULL_END
