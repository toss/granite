#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface GraniteMicroFrontendSessionRegistration : NSObject
- (void)invalidate;
@end

@interface GraniteMicroFrontendRuntimeHost : NSObject

+ (GraniteMicroFrontendSessionRegistration *)registerSession:(NSString *)sessionId
                                                closeHandler:(dispatch_block_t)closeHandler;

+ (void)emitPreloadApp:(NSString *)appName;
+ (void)emitOpenApp:(NSString *)sessionId
             appName:(NSString *)appName
              scheme:(NSString *)scheme;
+ (void)emitCloseApp:(NSString *)sessionId;
+ (void)emitSessionVisibilityChanged:(NSString *)sessionId
                           isVisible:(BOOL)isVisible;

@end

NS_ASSUME_NONNULL_END
