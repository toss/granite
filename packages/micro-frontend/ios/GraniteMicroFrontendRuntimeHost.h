#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class UIViewController;

/// Why `closeAppWithUnmountTimeout:onUnmount:` says the session's resources may now be released.
typedef NSString *GraniteMicroFrontendSessionReleaseReason NS_TYPED_EXTENSIBLE_ENUM;
/// JavaScript reported that the session's React tree unmounted (its effect cleanups have run).
FOUNDATION_EXPORT GraniteMicroFrontendSessionReleaseReason const GraniteMicroFrontendSessionReleaseReasonUnmounted;
/// JavaScript did not report the unmount within the timeout (a stalled runtime, or a bundle without the report).
FOUNDATION_EXPORT GraniteMicroFrontendSessionReleaseReason const GraniteMicroFrontendSessionReleaseReasonTimeout;
/// The JavaScript runtime that would report it is gone.
FOUNDATION_EXPORT GraniteMicroFrontendSessionReleaseReason const GraniteMicroFrontendSessionReleaseReasonRuntimeDetached;
/// No `closeApp` was sent (the session never opened, or was already closed), so JavaScript has nothing to unmount.
FOUNDATION_EXPORT GraniteMicroFrontendSessionReleaseReason const GraniteMicroFrontendSessionReleaseReasonNotOpened;

@interface GraniteMicroFrontendSessionRegistration : NSObject
- (void)openAppWithAppName:(NSString *)appName scheme:(NSString *)scheme;
- (BOOL)setVisible:(BOOL)isVisible;
- (BOOL)closeApp;
/// Sends `closeApp` like `closeApp`, then calls `onUnmount` exactly once, on the main thread, when the session's
/// resources may be released: when JavaScript reports the unmount, after `timeout`, or when the runtime is gone.
/// Keep what the session's JavaScript can still call (for example its native module registry) until then.
/// Returns whether `closeApp` was sent. `invalidate` may be called right after; it does not cancel `onUnmount`.
- (BOOL)closeAppWithUnmountTimeout:(NSTimeInterval)timeout
                         onUnmount:(void (^)(GraniteMicroFrontendSessionReleaseReason reason))onUnmount
    NS_SWIFT_NAME(closeApp(unmountTimeout:onUnmount:));
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
