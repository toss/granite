require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ============================================================
# GraniteImage Provider Selection
# ============================================================
# Set ONE of the following environment variables before `pod install`:
#   GRANITE_PROVIDER_URLSESSION=true  - URLSession (default, zero external dependencies)
#   GRANITE_PROVIDER_KINGFISHER=true  - Kingfisher library
#   GRANITE_PROVIDER_SDWEBIMAGE=true  - SDWebImage library
#   GRANITE_PROVIDER_NONE=true        - No default provider (you must register your own)
#
# Example: GRANITE_PROVIDER_KINGFISHER=true pod install
# Example: GRANITE_PROVIDER_NONE=true pod install
# ============================================================
granite_provider_none = ENV['GRANITE_PROVIDER_NONE'] == 'true'
granite_provider_kingfisher = ENV['GRANITE_PROVIDER_KINGFISHER'] == 'true'
granite_provider_sdwebimage = ENV['GRANITE_PROVIDER_SDWEBIMAGE'] == 'true'
# Default to URLSession if no provider is explicitly selected
granite_provider_urlsession = ENV['GRANITE_PROVIDER_URLSESSION'] == 'true' ||
                               (!granite_provider_none &&
                                !granite_provider_kingfisher &&
                                !granite_provider_sdwebimage)

# Build exclude patterns
exclude_patterns = []
unless granite_provider_urlsession
  exclude_patterns << "ios/Providers/URLSessionImageProvider.swift"
end
unless granite_provider_kingfisher
  exclude_patterns << "ios/Providers/KingfisherImageProvider.swift"
end
unless granite_provider_sdwebimage
  exclude_patterns << "ios/Providers/SDWebImageProvider.swift"
end

Pod::Spec.new do |s|
  s.name         = "GraniteImage"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/toss/granite.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"

  if exclude_patterns.length > 0
    s.exclude_files = exclude_patterns
  end

  # Set preprocessor macros
  preprocessor_defs = ['$(inherited)']
  preprocessor_defs << 'GRANITE_PROVIDER_URLSESSION=1' if granite_provider_urlsession
  preprocessor_defs << 'GRANITE_PROVIDER_KINGFISHER=1' if granite_provider_kingfisher
  preprocessor_defs << 'GRANITE_PROVIDER_SDWEBIMAGE=1' if granite_provider_sdwebimage

  swift_flags = []
  swift_flags << 'GRANITE_PROVIDER_URLSESSION' if granite_provider_urlsession
  swift_flags << 'GRANITE_PROVIDER_KINGFISHER' if granite_provider_kingfisher
  swift_flags << 'GRANITE_PROVIDER_SDWEBIMAGE' if granite_provider_sdwebimage

  s.pod_target_xcconfig = {
    'GCC_PREPROCESSOR_DEFINITIONS' => preprocessor_defs.join(' '),
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => swift_flags.join(' '),
    'CLANG_ENABLE_MODULES' => 'YES',
    'SWIFT_OBJC_INTERFACE_HEADER_NAME' => 'GraniteImage-Swift.h'
  }

  install_modules_dependencies(s)

  # Use SPM dependencies for image loading libraries (CocoaPods 1.12+)
  # Falls back to pod dependency if spm_dependency is not available
  if granite_provider_kingfisher
    if s.respond_to?(:spm_dependency)
      s.spm_dependency "Kingfisher", :git => "https://github.com/onevcat/Kingfisher.git", :from => "7.10.0"
    else
      s.dependency "Kingfisher", "~> 7.10"
    end
  end

  if granite_provider_sdwebimage
    if s.respond_to?(:spm_dependency)
      s.spm_dependency "SDWebImage", :git => "https://github.com/SDWebImage/SDWebImage.git", :from => "5.18.0"
    else
      s.dependency "SDWebImage", "~> 5.18"
    end
  end
end
