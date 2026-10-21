#import <CoreGraphics/CGGeometry.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// How the renderer sizes a component relative to its native view.
typedef NS_ENUM(NSInteger, RNComponentViewSizing) {
  /// The view sets the width and the content sets the height.
  RNComponentViewSizingContentHeight = 0,
  /// The content sets both the width and the height.
  RNComponentViewSizingContentSize = 1,
  /// The view sets both the width and the height, and the content fills it.
  RNComponentViewSizingConstrained = 2,
};

/// Posted on the main thread when a JavaScript renderer starts or stops receiving component sessions.
/// Read `RNComponentSessions.isRendererAttached` for the current state.
FOUNDATION_EXPORT NSNotificationName const RNComponentRendererDidChangeNotification;

/// A component registered with `AppRegistry.registerComponent` that the JavaScript renderer draws into the Portal host
/// named after the session id. A renderer that starts later, including one in a restarted runtime, receives every open
/// component with its latest props.
@interface RNComponentSessionRegistration : NSObject
/// Receives the content size the renderer measured, in points, on the main thread.
/// The renderer does not report sizes for `RNComponentViewSizingConstrained`.
@property(nonatomic, copy, nullable) void (^contentSizeHandler)(CGSize contentSize);
/// Opens the component. Only the first call per registration has an effect.
/// `props` must contain only JSON-compatible values.
- (void)openComponentWithName:(NSString *)componentName
                        props:(NSDictionary<NSString *, id> *)props
                       sizing:(RNComponentViewSizing)sizing
               bundleFilePath:(nullable NSString *)bundleFilePath;
/// Replaces the props of an open component. Returns NO if the component is not open.
- (BOOL)updateProps:(NSDictionary<NSString *, id> *)props;
/// Closes the component if it is open and removes the registration. Deallocating the registration does the same.
- (void)invalidate;
@end

/// The component sessions of the app. `RNComponentView` uses them; register one directly for a custom container.
@interface RNComponentSessions : NSObject

/// Registers a component session. Returns `nil` if `sessionId` is already registered. Use a unique id per Portal host
/// and invalidate the registration before reusing its id.
+ (nullable RNComponentSessionRegistration *)registerSession:(NSString *)sessionId;

/// YES while a JavaScript renderer receives component sessions.
@property(class, nonatomic, readonly) BOOL isRendererAttached;

- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
