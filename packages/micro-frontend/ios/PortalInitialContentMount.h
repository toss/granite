#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

// Internal acknowledgment ledger; only Fabric's transaction callbacks may complete a mount.
@interface GranitePortalInitialContentMount : NSObject
- (instancetype)initWithView:(RCTViewComponentView *)view;
- (void)willMount;
- (void)didMountWithSurfaceId:(NSInteger)surfaceId transaction:(NSInteger)transaction;
- (BOOL)matchesCompletedIdentity:(NSString *)nativeId;
@property (nonatomic, weak, readonly) RCTViewComponentView *view;
@end

FOUNDATION_EXPORT NSNotificationName const GranitePortalInitialContentMountsDidChange;
FOUNDATION_EXPORT void GranitePortalInitialContentMountsChanged(void);
FOUNDATION_EXPORT NSArray<GranitePortalInitialContentMount *> *GranitePortalInitialContentMounts(void);

NS_ASSUME_NONNULL_END
