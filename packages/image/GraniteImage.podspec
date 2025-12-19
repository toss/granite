require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# ============================================================
# GraniteImage Default Provider Configuration
# ============================================================
# By default, SDWebImage is included as the default provider.
# To exclude the default provider and use your own implementation:
#   GRANITE_IMAGE_DEFAULT_PROVIDER=false pod install
# ============================================================
use_default_provider = ENV.fetch('GRANITE_IMAGE_DEFAULT_PROVIDER', 'true') == 'true'

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
