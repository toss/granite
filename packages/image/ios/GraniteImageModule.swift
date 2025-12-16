import Foundation
import React

@objc(GraniteImageModule)
class GraniteImageModule: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc func preload(_ sourcesJson: String,
                       resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[GraniteImageModule] preload called with: \(sourcesJson)")

        guard let jsonData = sourcesJson.data(using: .utf8),
              let sources = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]] else {
            reject("PARSE_ERROR", "Failed to parse sources JSON", nil)
            return
        }

        guard let provider = GraniteImageRegistry.shared.provider else {
            reject("NO_PROVIDER", "No provider registered, cannot preload", nil)
            return
        }

        DispatchQueue.global(qos: .default).async {
            let group = DispatchGroup()
            var successCount = 0
            var failCount = 0
            let countLock = NSLock()

            for source in sources {
                guard let uri = source["uri"] as? String else { continue }

                let headers = source["headers"] as? [String: String]
                let priorityStr = source["priority"] as? String
                let cacheStr = source["cache"] as? String

                var priority: GraniteProviderPriority = .normal
                if priorityStr == "high" {
                    priority = .high
                } else if priorityStr == "low" {
                    priority = .low
                }

                var cachePolicy: GraniteProviderCachePolicy = .disk
                if cacheStr == "cacheOnly" {
                    cachePolicy = .disk
                } else if cacheStr == "web" {
                    cachePolicy = .none
                }

                NSLog("[GraniteImageModule] Preloading: \(uri)")

                // Use extended loading if available
                group.enter()
                if let loadImageExtended = provider.loadImage(withURL:into:contentMode:headers:priority:cachePolicy:defaultSource:progress:completion:) {
                    loadImageExtended(
                        uri,
                        nil,
                        .scaleAspectFill,
                        headers,
                        priority,
                        cachePolicy,
                        nil,
                        nil,
                        { image, error, imageSize in
                            countLock.lock()
                            if image != nil {
                                NSLog("[GraniteImageModule] Preloaded successfully: \(uri) (\(Int(imageSize.width))x\(Int(imageSize.height)))")
                                successCount += 1
                            } else {
                                NSLog("[GraniteImageModule] Preload failed for \(uri): \(error?.localizedDescription ?? "Unknown error")")
                                failCount += 1
                            }
                            countLock.unlock()
                            group.leave()
                        }
                    )
                } else {
                    NSLog("[GraniteImageModule] Provider does not support preloading without view")
                    group.leave()
                }
            }

            group.notify(queue: .main) {
                NSLog("[GraniteImageModule] Preload completed: \(successCount) succeeded, \(failCount) failed")
                resolve(nil)
            }
        }
    }

    @objc func clearMemoryCache(_ resolve: @escaping RCTPromiseResolveBlock,
                                 reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[GraniteImageModule] clearMemoryCache called")
        URLCache.shared.removeAllCachedResponses()
        resolve(nil)
    }

    @objc func clearDiskCache(_ resolve: @escaping RCTPromiseResolveBlock,
                               reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[GraniteImageModule] clearDiskCache called")
        URLCache.shared.removeAllCachedResponses()
        resolve(nil)
    }
}
