#import "GraniteDefaultModuleProvider.h"

// Declared in React-RCTAppDelegate but only exposed in ObjC++ headers.
#ifdef __cplusplus
extern "C" id RCTAppSetupDefaultModuleFromClass(
    Class moduleClass,
    id<RCTDependencyProvider> dependencyProvider);
#else
extern id RCTAppSetupDefaultModuleFromClass(
    Class moduleClass,
    id<RCTDependencyProvider> dependencyProvider);
#endif

@implementation GraniteDefaultModuleProvider

+ (id)defaultModuleInstanceForClass:(Class)moduleClass
                 dependencyProvider:(id<RCTDependencyProvider>)dependencyProvider
{
  return RCTAppSetupDefaultModuleFromClass(moduleClass, dependencyProvider);
}

@end
