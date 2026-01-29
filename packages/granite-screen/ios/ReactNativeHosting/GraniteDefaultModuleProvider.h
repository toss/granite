//  GraniteDefaultModuleProvider.h
//  GraniteScreen
//
//  Exposes default module provisioning to Swift
//

#import <Foundation/Foundation.h>
#if __has_include(<React-RCTAppDelegate/RCTDependencyProvider.h>)
#import <React-RCTAppDelegate/RCTDependencyProvider.h>
#else
#import <React_RCTAppDelegate/RCTDependencyProvider.h>
#endif

NS_ASSUME_NONNULL_BEGIN

@interface GraniteDefaultModuleProvider : NSObject

+ (nullable id)defaultModuleInstanceForClass:(Class)moduleClass
                          dependencyProvider:(nullable id<RCTDependencyProvider>)dependencyProvider
    NS_SWIFT_NAME(defaultModuleInstance(for:dependencyProvider:));

@end

NS_ASSUME_NONNULL_END
