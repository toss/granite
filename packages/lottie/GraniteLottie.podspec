require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ============================================================
# GraniteLottie Default Provider Configuration
# ============================================================
# Priority: GRANITE_LOTTIE_DEFAULT_PROVIDER > GRANITE_DEFAULT_PROVIDER_ALL > true (default)
#
# Examples:
#   Include default provider (default):
#     pod install
#
#   Exclude default provider for lottie only:
#     GRANITE_LOTTIE_DEFAULT_PROVIDER=false pod install
#
#   Exclude default providers for all Granite packages:
#     GRANITE_DEFAULT_PROVIDER_ALL=false pod install
#
#   Exclude all but override lottie to include:
#     GRANITE_DEFAULT_PROVIDER_ALL=false GRANITE_LOTTIE_DEFAULT_PROVIDER=true pod install
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

include_default_provider = resolve_default_provider(
  'GRANITE_LOTTIE_DEFAULT_PROVIDER',
  'GRANITE_DEFAULT_PROVIDER_ALL',
  true
)

Pod::Spec.new do |s|
  s.name         = "GraniteLottie"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["repository"]["url"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => package["repository"]["url"], :tag => "#{s.version}" }

  # Conditional source files based on environment variable
  if include_default_provider
    s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  else
    s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
    s.exclude_files = "ios/Providers/**/*"
  end
  s.private_header_files = "ios/**/*.h"

  # Swift settings for Pluggable Provider architecture
  s.pod_target_xcconfig = {
    'CLANG_ENABLE_MODULES' => 'YES',
    'SWIFT_OBJC_INTERFACE_HEADER_NAME' => 'GraniteLottie-Swift.h',
    'DEFINES_MODULE' => 'YES',
    'GCC_PREPROCESSOR_DEFINITIONS' => include_default_provider ? '$(inherited) GRANITE_LOTTIE_DEFAULT_PROVIDER=1' : '$(inherited) GRANITE_LOTTIE_DEFAULT_PROVIDER=0',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => include_default_provider ? '$(inherited) GRANITE_LOTTIE_DEFAULT_PROVIDER' : '$(inherited)'
  }

  # Conditional lottie-ios dependency
  if include_default_provider
    s.dependency 'lottie-ios', '~> 4.5.0'
  end

  install_modules_dependencies(s)
end
