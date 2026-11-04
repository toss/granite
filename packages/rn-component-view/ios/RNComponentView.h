#import <UIKit/UIKit.h>

#import "RNComponentSessions.h"

NS_ASSUME_NONNULL_BEGIN

@class RNComponentView;

/// Host hooks of `RNComponentView`, called on the main thread. Every method is optional.
@protocol RNComponentViewDelegate <NSObject>
@optional
/// Asked once, when the view first moves to a window, right before it opens its component session.
/// Return NO to leave the view empty; it then never opens a session.
- (BOOL)componentViewShouldOpenSession:(RNComponentView *)componentView;
/// The view opened its component session. A view created with deferred activation waits for
/// `-activateIfNeeded` before it shows content.
- (void)componentViewDidOpenSession:(RNComponentView *)componentView;
/// The renderer measured a new content size, in points. Not called for `RNComponentViewSizingConstrained`.
- (void)componentView:(RNComponentView *)componentView didChangeContentSize:(CGSize)contentSize;
@end

/// Shows a React Native component registered with `AppRegistry.registerComponent` inside a native view.
///
/// The JavaScript component renderer (`RNComponentViewRenderer`) draws the component into a Portal host inside
/// this view. The view opens a component session the first time it moves to a window and closes it when it is
/// deallocated. Leaving the window does not close the session: the Portal takes the content back and returns it when
/// the view moves to a window again. A renderer that starts later, including one in a restarted runtime, receives the
/// open component with its latest props.
///
/// Sizing: a Portal passes the host bounds to the React layout but never reports the content size back, so the
/// renderer measures the content and reports it to this view.
/// - `RNComponentViewSizingContentHeight`: the layout sets the width, and the intrinsic height follows the content.
/// - `RNComponentViewSizingContentSize`: the intrinsic width and height follow the content.
/// - `RNComponentViewSizingConstrained`: the layout sets both, and the content fills the view.
///
/// Before the first measurement a content-sized view takes `placeholderSize`, because the Portal lays content out only
/// in a host whose width and height are both non-zero. `placeholderView` covers the view until the content attaches
/// and, for content-sized views, until the renderer measures it. The view clips its content, so a component that has
/// not been measured yet does not spill over its neighbors.
@interface RNComponentView : UIView

/// Size the view takes before the renderer measures the content.
@property(class, nonatomic, readonly) CGSize placeholderSize;

/// Creates a view whose Portal host activates immediately. Use it once the React runtime has booted.
/// `props` must contain only JSON-compatible values.
- (instancetype)initWithComponentName:(NSString *)componentName
                                props:(NSDictionary<NSString *, id> *)props
                               sizing:(RNComponentViewSizing)sizing
                       bundleFilePath:(nullable NSString *)bundleFilePath;

/// Creates a view. With `deferredActivation`, the Portal host waits for `-activateIfNeeded`, for views created before
/// the React runtime has booted (see `PortalHostContainerView`).
- (instancetype)initWithComponentName:(NSString *)componentName
                                props:(NSDictionary<NSString *, id> *)props
                               sizing:(RNComponentViewSizing)sizing
                       bundleFilePath:(nullable NSString *)bundleFilePath
                   deferredActivation:(BOOL)deferredActivation NS_DESIGNATED_INITIALIZER;

- (instancetype)initWithFrame:(CGRect)frame NS_UNAVAILABLE;
- (nullable instancetype)initWithCoder:(NSCoder *)coder NS_UNAVAILABLE;

@property(nonatomic, readonly, copy) NSString *componentName;
/// Identifies the component session and names the Portal host the renderer draws into.
@property(nonatomic, readonly, copy) NSString *sessionId;
@property(nonatomic, readonly) RNComponentViewSizing sizing;
@property(nonatomic, weak, nullable) id<RNComponentViewDelegate> delegate;

/// Whether the renderer has reported a content size.
@property(nonatomic, readonly) BOOL hasContentSize;
/// The last content size the renderer reported, in points. `CGSizeZero` until `hasContentSize`.
@property(nonatomic, readonly) CGSize contentSize;

/// Covers the view until the content is ready. Style it to match the host app.
@property(nonatomic, readonly, strong) UIView *placeholderView;

/// Set when the host knows the content cannot show, for example because no renderer attached to the current
/// runtime. An unavailable view shows nothing and collapses its content-sized dimensions.
@property(nonatomic, getter=isUnavailable) BOOL unavailable;

/// Replaces the props. Before the session opens, the view opens it with the latest props.
- (void)updateProps:(NSDictionary<NSString *, id> *)props;

/// Activates a deferred Portal host. No-op when already active. Call on the main thread after the React runtime has
/// booted.
- (void)activateIfNeeded;

@end

NS_ASSUME_NONNULL_END
