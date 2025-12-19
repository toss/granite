require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ============================================================
# GraniteImage Default Provider Configuration
# ============================================================
# Priority: GRANITE_IMAGE_DEFAULT_PROVIDER > GRANITE_DEFAULT_PROVIDER_ALL > true (default)
#
# Examples:
#   Include default provider (default):
#     pod install
#
#   Exclude default provider for image only:
#     GRANITE_IMAGE_DEFAULT_PROVIDER=false pod install
#
#   Exclude default providers for all Granite packages:
#     GRANITE_DEFAULT_PROVIDER_ALL=false pod install
#
#   Exclude all but override image to include:
#     GRANITE_DEFAULT_PROVIDER_ALL=false GRANITE_IMAGE_DEFAULT_PROVIDER=true pod install
# ============================================================
def resolve_default_provider(specific_key, fallback_key, default_value)
  if ENV.key?(specific_key)
    ENV[specific_key] == 'true'
  elsif ENV.key?(fallback_key)
    ENV[fallback_key] == 'true'
  else
    default_value
  end
end

use_default_provider = resolve_default_provider(
  'GRANITE_IMAGE_DEFAULT_PROVIDER',
  'GRANITE_DEFAULT_PROVIDER_ALL',
  true
)

exclude_patterns = []
exclude_patterns << "ios/Providers/SDWebImageProvider.swift" unless use_default_provider

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
  s.exclude_files = exclude_patterns if exclude_patterns.any?

  # Set preprocessor macros
  swift_flags = []
  swift_flags << 'GRANITE_IMAGE_DEFAULT_PROVIDER' if use_default_provider

  s.pod_target_xcconfig = {
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => swift_flags.join(' '),
    'CLANG_ENABLE_MODULES' => 'YES',
    'SWIFT_OBJC_INTERFACE_HEADER_NAME' => 'GraniteImage-Swift.h'
  }

  install_modules_dependencies(s)

  # Include SDWebImage dependency only when using default provider
  if use_default_provider
    s.dependency "SDWebImage", "~> 5.18"
  end
end
