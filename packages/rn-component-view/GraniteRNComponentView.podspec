require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "GraniteRNComponentView"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/toss/granite"
  s.license      = package["license"]
  s.authors      = { "Granite Contributors" => "https://github.com/toss/granite" }
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/toss/granite.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm}"
  s.public_header_files = [
    "ios/RNComponentSessions.h",
    "ios/RNComponentView.h",
  ]
  s.private_header_files = [
    "ios/RNComponentSessionStore.h",
  ]

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "DEFINES_MODULE" => "YES"
  }

  # RNComponentView hosts its content in the Portal host of the micro-frontend runtime.
  s.dependency "GraniteMicroFrontendRuntime"

  install_modules_dependencies(s)
end
