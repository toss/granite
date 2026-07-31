require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "GranitePortal"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported, :tvos => min_ios_version_supported }
  s.source       = { :http => "https://registry.npmjs.org/@granite-js/portal/-/portal-#{s.version}.tgz" }

  s.source_files = "ios/**/*.{h,m,mm,cpp}"
  s.public_header_files = [
    "ios/PortalHostView.h",
    "ios/PortalHostContainerView.h",
  ]
  s.private_header_files = ["ios/PortalRegistry.h", "ios/PortalView.h"]

  install_modules_dependencies(s)

  s.subspec "common" do |ss|
    ss.source_files         = ["common/cpp/**/*.{cpp,h}"]
    ss.header_dir           = "react/renderer/components/TeleportViewSpec"
    ss.private_header_files = "common/cpp/**/*.{h}"
    ss.pod_target_xcconfig  = { "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/common/cpp\"" }
  end
end
