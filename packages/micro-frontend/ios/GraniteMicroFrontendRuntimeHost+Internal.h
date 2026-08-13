#import "GraniteMicroFrontendRuntimeHost.h"

NS_ASSUME_NONNULL_BEGIN

@protocol GraniteMicroFrontendRuntimeEventSink <NSObject>
- (BOOL)enqueueRuntimeEvent:(NSDictionary *)event;
@end

@interface GraniteMicroFrontendRuntimeHost (Internal)
+ (void)startEventDeliveryToEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)eventSink;
+ (void)detachEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)eventSink;
+ (void)emitOpenApp:(NSString *)sessionId appName:(NSString *)appName scheme:(NSString *)scheme;
+ (void)emitCloseApp:(NSString *)sessionId;
+ (void)emitSessionVisibilityChanged:(NSString *)sessionId isVisible:(BOOL)isVisible;
+ (void)unregisterSession:(NSString *)sessionId token:(NSString *)token;
@end

NS_ASSUME_NONNULL_END
