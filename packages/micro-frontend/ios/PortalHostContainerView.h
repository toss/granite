#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// Main-thread cancellation handle for one content-layout observation.
@protocol PortalContentLayoutObservation <NSObject>
- (void)cancel;
@end

/// UIKit-owned container for hosting teleported portal content outside the
/// React tree. This header intentionally imports UIKit only, so native
/// integrations can include it in build configurations where the React
/// renderer headers are unavailable (e.g. prebuilt React distributions).
@interface PortalHostContainerView : UIView

/// Creates a container that activates immediately (see `-activateIfNeeded`).
- (instancetype)initWithFrame:(CGRect)frame;

/// Creates a container that postpones creating the underlying Fabric host
/// view until `-activateIfNeeded` is called.
///
/// Deferred activation exists because constructing the host view runs
/// `RCTViewComponentView` initialization, which reads ReactNativeFeatureFlags.
/// React only allows overriding those flags before their first read, so a
/// container created before the app's React factory has booted (a parked
/// native destination, for example) would otherwise make the boot-time
/// override throw. Defer activation and call `-activateIfNeeded` once the
/// runtime is up — typically right before asking React to mount content.
- (instancetype)initWithFrame:(CGRect)frame deferredActivation:(BOOL)deferredActivation;

/// Registers the container under `name` so `<Portal hostName={name}>` content
/// teleports into it. Safe to call before activation; the name is applied
/// when the host view is created. Pass nil to unregister.
- (void)setName:(nullable NSString *)name;

/// Creates the underlying Fabric host view under an `RCTRootComponentView`
/// anchor, attaches the touch handler, and applies any pending name. No-op when
/// already activated. Must be called on the main thread after the React runtime
/// has booted.
///
/// The anchor makes hosted screens count as mounted under a React root for
/// react-native-screens, so they do not attach a second touch handler beneath
/// the container's. Hosted content therefore gets one handler and page
/// coordinates relative to this container, like content under a regular React
/// Native root.
- (void)activateIfNeeded;

/// Observes one exact initial-content marker on a native View in this destination.
/// Call and cancel on the main thread with a nonempty key and nonnegative Int32 revision.
/// The one-shot callback requires one matching Fabric nativeId and at least one physical
/// native descendant in the same Window. The marker's path through this container and the
/// counted descendant must be visible with nonzero alpha and positive bounds. Visible
/// descendants need visible bounds; only the marker-to-container path must have settled
/// layout. Descendant layout-request flags and hidden branches are ignored.
/// This does not acknowledge a Fabric commit, image/network completion, or presented pixels.
///
/// Observation never activates a deferred container or delays rendering. Its display link
/// runs only while attached, activated, and pending. Cancel when the caller stops waiting;
/// rename, detach, and invalidation also cancel it. Size changes preserve the observation
/// and continue structural checks. Delivery does not guarantee that descendants reflect
/// the latest host size; they may retain pre-resize bounds. PortalInitialContentView uses revision 0.
- (id<PortalContentLayoutObservation>)observeContentLayoutWithRequestKey:(NSString *)requestKey
                                                              revision:(NSInteger)revision
                                                               onReady:(void (^)(void))onReady
    NS_SWIFT_NAME(observeContentLayout(requestKey:revision:onReady:));

/// Whether the underlying Fabric host view has been created.
@property (nonatomic, readonly) BOOL isActivated;

/// Whether any teleported content view is currently attached.
@property (nonatomic, readonly) BOOL hasAttachedContent;

/// Called on the main thread when the first content view attaches.
@property (nonatomic, copy, nullable) void (^onContentDidAttach)(void);

/// Called on the main thread when the last content view detaches. Transient
/// remove-and-reinsert churn within one mount commit is re-checked on the
/// next run loop before this fires.
@property (nonatomic, copy, nullable) void (^onContentDidDetach)(void);

/// Unregisters the host and clears lifecycle callbacks. Call when the owning
/// screen is torn down; the container stops receiving teleported content.
- (void)invalidate;

@end

NS_ASSUME_NONNULL_END
