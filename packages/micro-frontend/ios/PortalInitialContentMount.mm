#import "PortalInitialContentMount.h"

NSNotificationName const GranitePortalInitialContentMountsDidChange = @"GranitePortalInitialContentMountsDidChange";

static NSHashTable<GranitePortalInitialContentMount *> *Mounts(void)
{
  static NSHashTable<GranitePortalInitialContentMount *> *mounts;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ mounts = [NSHashTable weakObjectsHashTable]; });
  return mounts;
}

void GranitePortalInitialContentMountsChanged(void)
{
  [[NSNotificationCenter defaultCenter] postNotificationName:GranitePortalInitialContentMountsDidChange object:nil];
}

NSArray<GranitePortalInitialContentMount *> *GranitePortalInitialContentMounts(void)
{
  return Mounts().allObjects;
}

@implementation GranitePortalInitialContentMount {
  NSString *_completedIdentity;
  NSInteger _surfaceId;
  NSInteger _transaction;
}

- (instancetype)initWithView:(RCTViewComponentView *)view
{
  if (self = [super init]) {
    _view = view;
    _transaction = -1;
    [Mounts() addObject:self];
  }
  return self;
}

- (void)willMount
{
  _completedIdentity = nil;
  _transaction = -1;
}

- (void)didMountWithSurfaceId:(NSInteger)surfaceId transaction:(NSInteger)transaction
{
  _surfaceId = surfaceId;
  _transaction = transaction;
  _completedIdentity = [self.view.nativeId copy];
  GranitePortalInitialContentMountsChanged();
}

- (BOOL)matchesCompletedIdentity:(NSString *)nativeId
{
  return _transaction >= 0 && [_completedIdentity isEqualToString:nativeId] &&
      [self.view.nativeId isEqualToString:nativeId];
}
@end
