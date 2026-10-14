import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { arch } from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, '../..');
const iosDirectory = resolve(packageDirectory, 'ios');
const stubIncludeDirectory = resolve(scriptDirectory, 'stubs');
const buildRoot = mkdtempSync(`${tmpdir()}/granite-portal-content-layout-ios-harness-`);
const appName = 'GranitePortalContentLayoutHarness';
const bundleId = 'run.granite.microfrontend.content-layout-harness';
const appPath = `${buildRoot}/${appName}.app`;
const executablePath = `${appPath}/${appName}`;

mkdirSync(appPath, { recursive: true });

const sdkPath = execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], {
  encoding: 'utf8',
}).trim();
const targetArch = arch === 'x64' ? 'x86_64' : 'arm64';

execFileSync('xcrun', [
  '--sdk',
  'iphonesimulator',
  'clang++',
  '-ObjC++',
  '-fobjc-arc',
  '-fblocks',
  '-target',
  `${targetArch}-apple-ios18.0-simulator`,
  '-isysroot',
  sdkPath,
  '-framework',
  'UIKit',
  '-framework',
  'Foundation',
  '-framework',
  'CoreGraphics',
  '-framework',
  'QuartzCore',
  '-I',
  stubIncludeDirectory,
  '-I',
  iosDirectory,
  resolve(iosDirectory, 'PortalHostContainerView.mm'),
  resolve(iosDirectory, 'PortalInitialContentMount.mm'),
  resolve(scriptDirectory, 'PortalHostContainerContentLayoutAppHarness.mm'),
  '-o',
  executablePath,
]);

writeFileSync(
  `${appPath}/Info.plist`,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>${appName}</string>
  <key>CFBundleIdentifier</key>
  <string>${bundleId}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>${appName}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
  <key>UILaunchStoryboardName</key>
  <string></string>
</dict>
</plist>
`
);

execFileSync('codesign', ['--force', '--sign', '-', appPath]);

console.log(
  JSON.stringify(
    {
      appPath,
      bundleId,
      executablePath,
      resultsPath: 'NSTemporaryDirectory()/granite-portal-content-layout-results.json',
      resultLabelAccessibilityIdentifier: 'granite-portal-content-layout-result',
    },
    null,
    2
  )
);
