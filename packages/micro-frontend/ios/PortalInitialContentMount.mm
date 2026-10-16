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
  NSString *_completedRequestKey;
  NSInteger _completedRevision;
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

- (void)setSentinel:(RCTViewComponentView *)sentinel
{
  [self willMount];
  _sentinel = sentinel;
}

- (void)setRequestKey:(NSString *)requestKey
{
  if (_requestKey == requestKey || [_requestKey isEqualToString:requestKey]) return;
  [self willMount];
  _requestKey = [requestKey copy];
}

- (void)setRevision:(NSInteger)revision
{
  if (_revision == revision) return;
  [self willMount];
  _revision = revision;
}

- (void)willMount
{
  _completedRequestKey = nil;
  _transaction = -1;
}

- (void)didMountWithSurfaceId:(NSInteger)surfaceId transaction:(NSInteger)transaction
{
  if (![self.sentinel.nativeId isEqualToString:@"granite:portal-mount-sentinel"]) return;
  if (self.requestKey.length == 0 || self.revision < 0) return;
  _surfaceId = surfaceId;
  _transaction = transaction;
  _completedRequestKey = [self.requestKey copy];
  _completedRevision = self.revision;
  GranitePortalInitialContentMountsChanged();
}

- (BOOL)matchesIdentity:(NSString *)requestKey revision:(NSInteger)revision
{
  return [self.requestKey isEqualToString:requestKey] && self.revision == revision;
}

- (BOOL)matchesCompletedIdentity:(NSString *)requestKey revision:(NSInteger)revision
{
  return [self.sentinel.nativeId isEqualToString:@"granite:portal-mount-sentinel"] &&
      _transaction >= 0 && [_completedRequestKey isEqualToString:requestKey] &&
      _completedRevision == revision && [self matchesIdentity:requestKey revision:revision];
}
@end
