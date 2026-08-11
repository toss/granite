#import "GraniteMicroFrontendRuntimeHost.h"

NS_ASSUME_NONNULL_BEGIN

@protocol GraniteMicroFrontendRuntimeEventSink <NSObject>
- (void)enqueueRuntimeEvent:(NSDictionary *)event;
@end

@interface GraniteMicroFrontendRuntimeHost (Internal)
+ (void)startEventDeliveryToEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)eventSink;
+ (void)detachEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)eventSink;
+ (BOOL)requestCloseSession:(NSString *)sessionId error:(NSError **)error;
+ (void)emitOpenApp:(NSString *)sessionId appName:(NSString *)appName scheme:(NSString *)scheme;
+ (void)emitCloseApp:(NSString *)sessionId;
+ (void)emitSessionVisibilityChanged:(NSString *)sessionId isVisible:(BOOL)isVisible;
+ (void)completePreloadApp:(NSString *)requestId errorMessage:(NSString *_Nullable)errorMessage;
+ (void)cancelPreloadApp:(NSString *)requestId;
+ (void)unregisterSession:(NSString *)sessionId token:(NSString *)token;
@end

NS_ASSUME_NONNULL_END
