const { createRequire } = require('node:module');
const path = require('node:path');

const imageDirectory = path.resolve(__dirname, '../..');
const imageRequire = createRequire(path.join(imageDirectory, 'package.json'));
const reactNativeRequire = createRequire(imageRequire.resolve('react-native/package.json'));
const codegenDirectory = path.dirname(reactNativeRequire.resolve('@react-native/codegen/package.json'));
const { combineSchemas } = require(path.join(codegenDirectory, 'lib/cli/combine/combine-js-to-schema.js'));
const codegen = require(path.join(codegenDirectory, 'lib/generators/RNCodegen.js'));
const schema = combineSchemas([path.join(imageDirectory, 'src/GraniteImageNativeComponent.ts')], 'GraniteImageSpec');

if (
  !codegen.generate(
    {
      libraryName: 'GraniteImageSpec',
      schema,
      outputDirectory: path.join(__dirname, 'build/generated/codegen'),
      packageName: 'com.facebook.react.viewmanagers',
    },
    { generators: ['componentsAndroid'] }
  )
) {
  throw new Error('Image component codegen failed');
}
