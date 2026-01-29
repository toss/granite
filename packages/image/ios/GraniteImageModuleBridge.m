#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(GraniteImageModule, NSObject)

RCT_EXTERN_METHOD(preload:(NSString *)sourcesJson
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearMemoryCache:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearDiskCache:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
