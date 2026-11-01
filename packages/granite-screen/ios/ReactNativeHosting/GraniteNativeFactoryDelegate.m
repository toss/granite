//
// GraniteNativeFactoryDelegate.m
// GraniteScreen
//
// Base factory delegate that exposes the host start callback to Swift
//

#import "GraniteNativeFactoryDelegate.h"
#import "GraniteBackButtonView.h"

@class RCTHost;

// `RCTReactNativeFactoryDelegate` adopts `RCTHostDelegate` only under
// `__cplusplus`, so this selector is invisible here. Redeclaring it keeps the
// file plain Objective-C.
@interface RCTDefaultReactNativeFactoryDelegate (GraniteHostDidStart)
- (void)hostDidStart:(RCTHost *)host;
@end

@implementation GraniteNativeFactoryDelegate

- (instancetype)init {
  // BackButton checks for this view when its module is evaluated. The delegate exists before any host
  // starts, so registering here runs ahead of every bundle.
  GraniteRegisterBackButtonView();
  return [super init];
}

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
