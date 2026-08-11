require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "GraniteMicroFrontendRuntime"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/toss/granite"
  s.license      = package["license"]
  s.authors      = { "Granite Contributors" => "https://github.com/toss/granite" }
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/toss/granite.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,cpp}"
  s.public_header_files = [
    "ios/GraniteMicroFrontendRuntimeHost.h",
    "ios/PortalHostContainerView.h",
  ]
  s.private_header_files = [
    "ios/GraniteMicroFrontendRuntimeHost+Internal.h",
    "ios/PortalHostView.h",
    "ios/PortalRegistry.h",
    "ios/PortalView.h",
  ]

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "DEFINES_MODULE" => "YES"
  }

  install_modules_dependencies(s)

  s.subspec "common" do |ss|
    ss.source_files         = ["common/cpp/**/*.{cpp,h}"]
    ss.header_dir           = "react/renderer/components/GraniteMicroFrontendRuntimeSpec"
    ss.private_header_files = "common/cpp/**/*.{h}"
    ss.pod_target_xcconfig  = { "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/common/cpp\"" }
  end
end
