//
//  PortalRegistry.m
//  Pods
//
//  Created by Kiryl Ziusko on 04/09/2025.
//

#import "PortalRegistry.h"
#import "PortalHostView.h"
#import "PortalView.h"

@interface PortalRegistry ()

@property (nonatomic, strong) NSMutableDictionary<NSString *, NSPointerArray *> *hosts;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSPointerArray *> *pendingPortals;

@end

@implementation PortalRegistry

+ (instancetype)sharedInstance
{
  static PortalRegistry *sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [[self alloc] init];
  });
  return sharedInstance;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _hosts = [NSMutableDictionary dictionary];
    _pendingPortals = [NSMutableDictionary dictionary];
  }
  return self;
}

- (void)registerHost:(PortalHostView *)host withName:(NSString *)name
{
  if (!name || !host) {
    return;
  }

  NSPointerArray *namedHosts = self.hosts[name];
  if (!namedHosts) {
    namedHosts = [NSPointerArray weakObjectsPointerArray];
    self.hosts[name] = namedHosts;
  }

  [namedHosts compact];
  for (NSInteger index = (NSInteger)namedHosts.count - 1; index >= 0; index--) {
    PortalHostView *existingHost = (__bridge PortalHostView *)[namedHosts pointerAtIndex:index];
    if (existingHost == host) {
      [namedHosts removePointerAtIndex:index];
    }
  }
  [namedHosts addPointer:(__bridge void *)host];
  [self notifySubscribersForName:name];
}

- (void)unregisterHost:(PortalHostView *)host withName:(NSString *)name
{
  if (!name || !host) {
    return;
  }

  NSPointerArray *namedHosts = self.hosts[name];
  if (namedHosts) {
    for (NSInteger index = (NSInteger)namedHosts.count - 1; index >= 0; index--) {
      PortalHostView *existingHost = (__bridge PortalHostView *)[namedHosts pointerAtIndex:index];
      if (!existingHost || existingHost == host) {
        [namedHosts removePointerAtIndex:index];
      }
    }
    [namedHosts compact];
    if (namedHosts.count == 0) {
      [self.hosts removeObjectForKey:name];
    }
  }
  [self notifySubscribersForName:name];
}

- (void)notifySubscribersForName:(NSString *)name
{
  NSPointerArray *portals = self.pendingPortals[name];
  if (!portals) {
    return;
  }

  [portals compact];

  for (NSUInteger i = 0; i < portals.count; i++) {
    PortalView *portal = (__bridge PortalView *)[portals pointerAtIndex:i];
    if (portal) {
      [portal onHostChanged];
    }
  }
}

- (nullable PortalHostView *)resolveHostWithName:(nullable NSString *)name
                                      sourceView:(UIView *)sourceView
{
  if (!name) {
    return nil;
  }

  NSPointerArray *namedHosts = self.hosts[name];
  if (!namedHosts) {
    return nil;
  }

  [namedHosts compact];
  if (namedHosts.count == 0) {
    [self.hosts removeObjectForKey:name];
    return nil;
  }

  UIWindow *sourceWindow = sourceView.window;
  if (sourceWindow) {
    for (NSInteger index = (NSInteger)namedHosts.count - 1; index >= 0; index--) {
      PortalHostView *host = (__bridge PortalHostView *)[namedHosts pointerAtIndex:index];
      if (host.window == sourceWindow) {
        return host;
      }
    }
  }

  for (NSInteger index = (NSInteger)namedHosts.count - 1; index >= 0; index--) {
    PortalHostView *host = (__bridge PortalHostView *)[namedHosts pointerAtIndex:index];
    if (host.window) {
      return host;
    }
  }
  return nil;
}

- (void)notifyHostLayoutChangedWithName:(NSString *)name
{
  if (!name) {
    return;
  }

  NSPointerArray *portals = self.pendingPortals[name];
  if (!portals) {
    return;
  }

  [portals compact];

  for (NSUInteger i = 0; i < portals.count; i++) {
    PortalView *portal = (__bridge PortalView *)[portals pointerAtIndex:i];
    if (portal) {
      [portal onHostLayoutChanged];
    }
  }
}

- (void)registerPendingPortal:(PortalView *)portal withHostName:(NSString *)hostName
{
  if (!hostName || !portal) {
    return;
  }

  NSPointerArray *portals = self.pendingPortals[hostName];
  if (!portals) {
    portals = [NSPointerArray weakObjectsPointerArray];
    self.pendingPortals[hostName] = portals;
  }

  [portals addPointer:(__bridge void *)portal];
}

- (void)unregisterPendingPortal:(PortalView *)portal withHostName:(NSString *)hostName
{
  if (!hostName || !portal) {
    return;
  }

  NSPointerArray *portals = self.pendingPortals[hostName];
  if (!portals) {
    return;
  }

  // Remove the portal from the array
  for (NSUInteger i = 0; i < portals.count; i++) {
    PortalView *existingPortal = (__bridge PortalView *)[portals pointerAtIndex:i];
    if (existingPortal == portal) {
      [portals removePointerAtIndex:i];
      break;
    }
  }

  // Clean up if no more portals
  [portals compact];
  if (portals.count == 0) {
    [self.pendingPortals removeObjectForKey:hostName];
  }
}

@end
