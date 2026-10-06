//
// GraniteNativeFactoryDelegate.m
// GraniteScreen
//
// Base factory delegate that exposes the host start callback to Swift
//

#import "GraniteNativeFactoryDelegate.h"

@class RCTHost;

// `RCTReactNativeFactoryDelegate` adopts `RCTHostDelegate` only under
// `__cplusplus`, so this selector is invisible here. Redeclaring it keeps the
// file plain Objective-C.
@interface RCTDefaultReactNativeFactoryDelegate (GraniteHostDidStart)
- (void)hostDidStart:(RCTHost *)host;
@end

@implementation GraniteNativeFactoryDelegate

// Keep the explicit opt-in for older RN versions. RN87 no longer exposes this
// selector to Swift, so implementing it here avoids a version-dependent override.
- (BOOL)bridgelessEnabled {
  return YES;
}

- (void)hostDidStart:(RCTHost *)host {
  [super hostDidStart:host];
  [self graniteHostDidStart];
}

- (void)graniteHostDidStart {
}

@end
