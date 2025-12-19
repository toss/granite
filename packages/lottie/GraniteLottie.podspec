require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Read environment variable for default provider inclusion (default: true)
include_default_provider = ENV['GRANITE_LOTTIE_DEFAULT_PROVIDER'] != 'false'

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
