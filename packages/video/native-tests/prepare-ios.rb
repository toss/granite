require 'json'
require 'fileutils'
require 'xcodeproj'

root = File.realpath(ARGV.fetch(0))
video = File.expand_path('..', __dir__)
FileUtils.mkdir_p("#{root}/ios")
File.write("#{root}/package.json", JSON.pretty_generate({
  name: 'granite-video-native-tests', version: '0.0.0', private: true,
  packageManager: 'yarn@4.12.0',
  dependencies: {
    'react' => '19.2.3', 'react-native' => '0.86.3',
    '@react-native-community/cli' => '20.1.0',
    '@react-native-community/cli-platform-ios' => '20.1.0',
    '@granite-js/video' => "portal:#{video}"
  }
}))
File.write("#{root}/.yarnrc.yml", "nodeLinker: node-modules\n")
File.write("#{root}/react-native.config.js", "module.exports = {project: {ios: {sourceDir: './ios'}}};\n")
File.write("#{root}/ios/main.m", <<~OBJC)
  #import <UIKit/UIKit.h>
  @interface TestAppDelegate : UIResponder <UIApplicationDelegate>
  @property(strong, nonatomic) UIWindow *window;
  @end
  @implementation TestAppDelegate
  - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)options {
    self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
    self.window.rootViewController = [UIViewController new];
    [self.window makeKeyAndVisible];
    return YES;
  }
  @end
  int main(int argc, char **argv) {
    @autoreleasepool { return UIApplicationMain(argc, argv, nil, @"TestAppDelegate"); }
  }
OBJC
project = Xcodeproj::Project.new("#{root}/ios/NativeVideoTests.xcodeproj")
target = project.new_target(:application, 'NativeVideoTests', :ios, '15.1')
target.add_file_references([project.new_file('main.m')])
target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'org.granite.video.tests'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
end
project.save
File.write("#{root}/ios/Podfile", <<~'PODFILE')
  ENV['RCT_NEW_ARCH_ENABLED'] = '1'
  ENV['RCT_USE_PREBUILT_RNCORE'] = '1'
  ENV['RCT_USE_RN_DEP'] = '1'
  require File.join(__dir__, '../node_modules/react-native/scripts/react_native_pods')
  platform :ios, min_ios_version_supported
  prepare_react_native_project!
  use_frameworks! :linkage => :static
  target 'NativeVideoTests' do
    config = use_native_modules!
    pod 'GraniteVideo', :path => '../node_modules/@granite-js/video', :testspecs => ['ProviderTests']
    use_react_native!(:path => config[:reactNativePath], :app_path => File.expand_path('..', __dir__))
    post_install do |installer|
      react_native_post_install(installer, config[:reactNativePath], :mac_catalyst_enabled => false)
    end
  end
PODFILE
