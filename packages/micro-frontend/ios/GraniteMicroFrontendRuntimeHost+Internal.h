#import "GraniteMicroFrontendRuntimeHost.h"

NS_ASSUME_NONNULL_BEGIN

@protocol GraniteMicroFrontendRuntimeEventSink <NSObject>
- (void)enqueueRuntimeEvent:(NSDictionary *)event;
@end

@interface GraniteMicroFrontendRuntimeHost (Internal)
+ (void)attachEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)eventSink;
+ (void)detachEventSink:(id<GraniteMicroFrontendRuntimeEventSink>)eventSink;
+ (BOOL)requestCloseSession:(NSString *)sessionId error:(NSError **)error;
+ (void)unregisterSession:(NSString *)sessionId token:(NSString *)token;
@end

NS_ASSUME_NONNULL_END
