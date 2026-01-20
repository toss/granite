//
//  BundleEvaluator.h
//  Pods
//
//  Created by 오 진성B on 10/8/25.
//

#import <Foundation/Foundation.h>

@interface BundleEvaluator : NSObject

+ (void)evaluate:(NSData *)scriptData
                   url:(NSString *)url
           bridgeProxy:(id)bridgeProxy
            completion:(void (^)(NSError *))completion;
@end
