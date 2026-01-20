//
//  BundleEvaluator.mm
//  Pods
//
//  Created by 오 진성B on 10/8/25.
//

#import "BundleEvaluator.h"
#import <React/RCTBridgeProxy.h>
#import <React-callinvoker/ReactCommon/CallInvoker.h>
#import <jsi/jsi.h>

@interface RCTBridgeProxy (JSIRuntime)
- (void *)runtime;
@end

@interface RCTBridgeProxy (RCTTurboModule)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
@end

@implementation BundleEvaluator

+ (void)evaluate:(NSData *)scriptData
                   url:(NSString *)url
                bridgeProxy:(id)bridgeProxy
            completion:(void (^)(NSError *))completion {

    // Cast to RCTBridgeProxy
    RCTBridgeProxy *bridgeProxyObj = (RCTBridgeProxy *)bridgeProxy;

    // Get CallInvoker
    std::shared_ptr<facebook::react::CallInvoker> callInvoker = bridgeProxyObj.jsCallInvoker;
    if (!callInvoker) {
        NSError *error = [NSError errorWithDomain:@"TossBundleLoader"
                                             code:500
                                         userInfo:@{NSLocalizedDescriptionKey: @"CallInvoker unavailable"}];
        completion(error);
        return;
    }

    // Get runtime pointer
    facebook::jsi::Runtime *runtime = (facebook::jsi::Runtime *)bridgeProxyObj.runtime;
    if (!runtime) {
        NSError *error = [NSError errorWithDomain:@"TossBundleLoader"
                                             code:500
                                         userInfo:@{NSLocalizedDescriptionKey: @"Runtime unavailable"}];
        completion(error);
        return;
    }

    // Prepare source
    std::string source{static_cast<const char *>([scriptData bytes]), [scriptData length]};
    std::string sourceUrl{[url UTF8String]};

    // Execute on JS thread
    callInvoker->invokeAsync([source = std::move(source),
                             sourceUrl = std::move(sourceUrl),
                             runtime,
                             completion]() {
        try {
            runtime->evaluateJavaScript(
                std::make_unique<facebook::jsi::StringBuffer>(std::move(source)),
                sourceUrl
            );
            completion(nil);
        } catch (const std::exception &e) {
            NSString *errorString = [NSString stringWithUTF8String:e.what()];
            NSError *error = [NSError errorWithDomain:@"TossBundleLoader"
                                                 code:500
                                             userInfo:@{NSLocalizedDescriptionKey: errorString}];
            completion(error);
        }
    });
}

@end
