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

- (void)hostDidStart:(RCTHost *)host {
  [super hostDidStart:host];
  [self graniteHostDidStart];
}

- (void)graniteHostDidStart {
}

@end
