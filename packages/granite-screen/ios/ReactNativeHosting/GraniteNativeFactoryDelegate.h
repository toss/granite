//
// GraniteNativeFactoryDelegate.h
// GraniteScreen
//
// Base factory delegate that exposes the host start callback to Swift
//

#if __has_include(<React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>)
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#else
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#endif

NS_ASSUME_NONNULL_BEGIN

/// Base delegate that republishes `hostDidStart:`, which Swift cannot override
@interface GraniteNativeFactoryDelegate : RCTDefaultReactNativeFactoryDelegate

/// called right after the React Native instance is created, before the JS bundle is evaluated
- (void)graniteHostDidStart;

@end

NS_ASSUME_NONNULL_END
