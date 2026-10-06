#import "Fixture.h"
#import <objc/message.h>

@implementation RCTBridge
@end
@implementation RCTHost
@end

static NSInteger hostStartCount = 0;

@implementation RCTDefaultReactNativeFactoryDelegate
- (NSURL *)bundleURL { return nil; }
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge { return nil; }
#if GRANITE_TEST_LEGACY_DELEGATE
// A false superclass default proves that Granite preserves its explicit opt-in.
- (BOOL)bridgelessEnabled { return NO; }
#endif
- (void)hostDidStart:(RCTHost *)host { hostStartCount += 1; }
@end

BOOL readBridgelessEnabled(id delegate) {
  return ((BOOL (*)(id, SEL))objc_msgSend)(delegate, NSSelectorFromString(@"bridgelessEnabled"));
}

NSInteger baseHostStartCount(void) {
  return hostStartCount;
}
