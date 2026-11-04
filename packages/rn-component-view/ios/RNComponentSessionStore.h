#import <CoreGraphics/CGGeometry.h>
#import <Foundation/Foundation.h>

#import "RNComponentSessions.h"

NS_ASSUME_NONNULL_BEGIN

/// Receives the component-session events for the JavaScript renderer.
@protocol RNComponentEventSink <NSObject>
/// Schedules `event` for the renderer. Returns NO when it could not be scheduled.
- (BOOL)enqueueEvent:(NSDictionary *)event;
@end

/// Component sessions live in native state. A renderer that starts delivery, including one in a restarted runtime,
/// first receives every open component with its latest props, then each change as it happens. The first live sink
/// receives the events until it detaches.
@interface RNComponentSessionStore : NSObject

@property(class, nonatomic, readonly) RNComponentSessionStore *sharedStore;

/// Registers a component session. Returns `nil` if `sessionId` is already registered.
- (nullable RNComponentSessionRegistration *)registerSession:(NSString *)sessionId;

/// YES while a sink receives component-session events.
@property(nonatomic, readonly) BOOL isRendererAttached;

/// Attaches `sink` and sends it every open component. The first live sink wins; a repeated start from the attached
/// sink resends the open components.
- (void)startDeliveryToEventSink:(id<RNComponentEventSink>)sink;

/// Detaches `sink` if it is the attached sink. Compares identity, so a sink can detach from its `-dealloc`.
- (void)detachEventSink:(id)sink;

/// Forwards a measured content size to the session's handler on the main thread. Ignored unless `sink` is attached.
- (void)reportContentSize:(CGSize)contentSize
                sessionId:(NSString *)sessionId
            fromEventSink:(id<RNComponentEventSink>)sink;

@end

NS_ASSUME_NONNULL_END
