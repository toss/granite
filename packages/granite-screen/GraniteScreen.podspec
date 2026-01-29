Pod::Spec.new do |s|
  s.name         = "GraniteScreen"
  s.version      = "1.0.0"
  s.summary      = "Screen management module for Granite framework"
  s.description  = "Provides GraniteViewController and related components for React Native integration"
  s.homepage     = "https://github.com/toss/brick"
  s.license      = { :type => "Apache-2.0", :file => "LICENSE" }
  s.author       = { "Toss" => "opensource@toss.im" }

  s.platforms    = { :ios => '13.0' }
  s.source       = { :path => "." }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.public_header_files = "ios/**/*.h"
  s.private_header_files = "ios/**/*+*.h"

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'OTHER_SWIFT_FLAGS' => "-enable-experimental-feature AccessLevelOnImport"
  }

  s.dependency "ReactAppDependencyProvider"
  add_dependency(s, "React-RCTAppDelegate")
  install_modules_dependencies(s)
end
