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
+ (GraniteMicroFrontendViewControllerSessionBinding *)bindViewController:(UIViewController *)viewController
                                                               sessionId:(NSString *)sessionId
                                                                 appName:(NSString *)appName
                                                                  scheme:(NSString *)scheme
                                                            closeHandler:(dispatch_block_t)closeHandler;
- (void)invalidate;
@end

typedef void (^GraniteMicroFrontendPreloadCompletion)(NSError *_Nullable error);

@interface GraniteMicroFrontendPreloadRegistration : NSObject
- (void)invalidate;
@end

@interface GraniteMicroFrontendRuntimeHost : NSObject

+ (GraniteMicroFrontendSessionRegistration *)registerSession:(NSString *)sessionId
                                                closeHandler:(dispatch_block_t)closeHandler;

+ (void)emitPreloadApp:(NSString *)appName;
+ (GraniteMicroFrontendPreloadRegistration *)requestPreloadApp:(NSString *)appName
                                                   completion:(GraniteMicroFrontendPreloadCompletion)completion;

@end

NS_ASSUME_NONNULL_END
