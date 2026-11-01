//
// GraniteBackButtonView.h
// GraniteScreen
//
// Native view class around the iOS header back button from @granite-js/react-native
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Class name of the Fabric view that wraps the `BackButton` from @granite-js/react-native on iOS.
/// Hosts find the header back button by this class, for example to draw a native back button in its place.
/// Hosts depend on this name, so keep it stable.
FOUNDATION_EXPORT NSString *const GraniteBackButtonViewClassName;

/// Registers the back button view with Fabric. `BackButton` only renders it once it is registered,
/// so call this before the JS bundle is evaluated. `GraniteNativeFactoryDelegate` calls it when it is created.
/// Calling it again does nothing.
FOUNDATION_EXPORT void GraniteRegisterBackButtonView(void);

NS_ASSUME_NONNULL_END
