require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ============================================================
# Provider Selection (Environment Variables)
# ============================================================
# Usage:
#   Default (AVPlayer):  pod install                                    (default: true)
#   No provider:         GRANITE_VIDEO_DEFAULT_PROVIDER=false pod install
#                        (then register your own provider in AppDelegate)
# ============================================================

provider_env = ENV['GRANITE_VIDEO_DEFAULT_PROVIDER']&.downcase
use_default_provider = (provider_env != 'false')  # default: true

# Exclude AVPlayerProvider when not using default provider
exclude_patterns = []
exclude_patterns << "ios/Providers/AVPlayerProvider.swift" if use_default_provider

Pod::Spec.new do |s|
  s.name         = "GraniteVideo"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/toss/granite.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.exclude_files = exclude_patterns if exclude_patterns.any?

  # Preprocessor definitions for conditional compilation
  preprocessor_defs = ['$(inherited)']
  preprocessor_defs << 'GRANITE_VIDEO_DEFAULT_PROVIDER=1' if use_default_provider

  s.pod_target_xcconfig = {
    'CLANG_ENABLE_MODULES' => 'YES',
    'DEFINES_MODULE' => 'YES',
    'SWIFT_OBJC_INTERFACE_HEADER_NAME' => 'GraniteVideo-Swift.h',
    'GCC_PREPROCESSOR_DEFINITIONS' => preprocessor_defs.join(' ')
  }

  s.frameworks = ["AVFoundation", "AVKit", "CoreMedia"]

  # React Native modules dependencies (Fabric/TurboModule)
  install_modules_dependencies(s)
end
