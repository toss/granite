import Foundation
import React

enum GreenfieldBundleLoader {
  private static let bundleRoot = "index"
  private static let embeddedBundleName = "main"
  private static let embeddedBundleExtension = "jsbundle"

  // Replace this with the CDN bundle URL returned by `granite forge`.
  private static let remoteBundleURLString = ""

  static func bundleURL() -> URL? {
    #if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: bundleRoot)
    #else
    if let localURL = cachedLocalBundleURL(), FileManager.default.fileExists(atPath: localURL.path) {
      return localURL
    }

    if let embeddedURL = Bundle.main.url(forResource: embeddedBundleName, withExtension: embeddedBundleExtension) {
      return embeddedURL
    }

    return downloadRemoteBundle()
    #endif
  }

  private static func cachedLocalBundleURL() -> URL? {
    FileManager.default
      .urls(for: .cachesDirectory, in: .userDomainMask)
      .first?
      .appendingPathComponent("granite-bundles", isDirectory: true)
      .appendingPathComponent("\(embeddedBundleName).\(embeddedBundleExtension)")
  }

  private static func downloadRemoteBundle() -> URL? {
    let remoteURLString = remoteBundleURLString.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !remoteURLString.isEmpty,
          let remoteURL = URL(string: remoteURLString),
          let cacheURL = cachedLocalBundleURL() else {
      return nil
    }

    do {
      try FileManager.default.createDirectory(
        at: cacheURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      let bundleData = try Data(contentsOf: remoteURL)
      try bundleData.write(to: cacheURL, options: .atomic)
      return cacheURL
    } catch {
      return nil
    }
  }
}
