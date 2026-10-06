#import <Foundation/Foundation.h>
#import <React/React.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTDefaultReactNativeFactoryDelegate : NSObject
- (nullable NSURL *)bundleURL;
- (nullable NSURL *)sourceURLForBridge:(RCTBridge *)bridge;
#if GRANITE_TEST_LEGACY_DELEGATE
- (BOOL)bridgelessEnabled;
#endif
- (void)hostDidStart:(RCTHost *)host;
@end

NS_ASSUME_NONNULL_END
