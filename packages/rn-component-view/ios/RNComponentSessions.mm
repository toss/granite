#import "RNComponentSessions.h"

#import "RNComponentSessionStore.h"

@implementation RNComponentSessions

+ (nullable RNComponentSessionRegistration *)registerSession:(NSString *)sessionId {
  return [RNComponentSessionStore.sharedStore registerSession:sessionId];
}

+ (BOOL)isRendererAttached {
  return RNComponentSessionStore.sharedStore.isRendererAttached;
}

@end
