require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ============================================================
# GraniteVideo Default Provider Configuration
# ============================================================
# Priority: GRANITE_VIDEO_DEFAULT_PROVIDER > GRANITE_DEFAULT_PROVIDER_ALL > true (default)
#
# Examples:
#   Include default provider (default):
#     pod install
#
#   Exclude default provider for video only:
#     GRANITE_VIDEO_DEFAULT_PROVIDER=false pod install
#
#   Exclude default providers for all Granite packages:
#     GRANITE_DEFAULT_PROVIDER_ALL=false pod install
#
#   Exclude all but override video to include:
#     GRANITE_DEFAULT_PROVIDER_ALL=false GRANITE_VIDEO_DEFAULT_PROVIDER=true pod install
# ============================================================
resolve_default_provider = lambda do |specific_key, fallback_key, default_value|
  if ENV.key?(specific_key)
    ENV[specific_key] == 'true'
  elsif ENV.key?(fallback_key)
    ENV[fallback_key] == 'true'
  else
    default_value
  end
end

use_default_provider = resolve_default_provider.call(
  'GRANITE_VIDEO_DEFAULT_PROVIDER',
  'GRANITE_DEFAULT_PROVIDER_ALL',
  true
)

# Exclude AVPlayerProvider when not using default provider
exclude_patterns = []
exclude_patterns << "ios/Providers/AVPlayerProvider.swift" unless use_default_provider

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
