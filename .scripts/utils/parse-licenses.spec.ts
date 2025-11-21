import { describe, it, expect } from 'vitest';
import { parseLicenses } from './licenses.mjs';

describe('parseLicenses', () => {
  //  yarn licenses list --json  --focus @granite-js/react-native
  const stdout = `
{"value":"MIT","children":{"@babel/core@npm:7.24.9::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40babel%2Fcore%2F-%2Fcore-7.24.9.tgz":{"value":{"locator":"@babel/core@npm:7.24.9::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40babel%2Fcore%2F-%2Fcore-7.24.9.tgz","descriptor":"@babel/core@npm:^7.24.9"},"children":{"url":"https://github.com/babel/babel.git","vendorName":"The Babel Team","vendorUrl":"https://babel.dev/docs/en/next/babel-core"}},"@babel/preset-env@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:7.24.8::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40babel%2Fpreset-env%2F-%2Fpreset-env-7.24.8.tgz":{"value":{"locator":"@babel/preset-env@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:7.24.8::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40babel%2Fpreset-env%2F-%2Fpreset-env-7.24.8.tgz","descriptor":"@babel/preset-env@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:^7.24.8"},"children":{"url":"https://github.com/babel/babel.git","vendorName":"The Babel Team","vendorUrl":"https://babel.dev/docs/en/next/babel-preset-env"}},"@babel/preset-typescript@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:7.24.7::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40babel%2Fpreset-typescript%2F-%2Fpreset-typescript-7.24.7.tgz":{"value":{"locator":"@babel/preset-typescript@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:7.24.7::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40babel%2Fpreset-typescript%2F-%2Fpreset-typescript-7.24.7.tgz","descriptor":"@babel/preset-typescript@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:^7.24.7"},"children":{"url":"https://github.com/babel/babel.git","vendorName":"The Babel Team","vendorUrl":"https://babel.dev/docs/en/next/babel-preset-typescript"}},"@types/babel__core@npm:7.20.5::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Fbabel__core%2F-%2Fbabel__core-7.20.5.tgz":{"value":{"locator":"@types/babel__core@npm:7.20.5::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Fbabel__core%2F-%2Fbabel__core-7.20.5.tgz","descriptor":"@types/babel__core@npm:^7"},"children":{"url":"https://github.com/DefinitelyTyped/DefinitelyTyped.git","vendorUrl":"https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/babel__core"}},"@types/babel__preset-env@npm:7.9.7::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Fbabel__preset-env%2F-%2Fbabel__preset-env-7.9.7.tgz":{"value":{"locator":"@types/babel__preset-env@npm:7.9.7::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Fbabel__preset-env%2F-%2Fbabel__preset-env-7.9.7.tgz","descriptor":"@types/babel__preset-env@npm:^7"},"children":{"url":"https://github.com/DefinitelyTyped/DefinitelyTyped.git","vendorUrl":"https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/babel__preset-env"}},"@types/debug@npm:4.1.12::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Fdebug%2F-%2Fdebug-4.1.12.tgz":{"value":{"locator":"@types/debug@npm:4.1.12::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Fdebug%2F-%2Fdebug-4.1.12.tgz","descriptor":"@types/debug@npm:^4"},"children":{"url":"https://github.com/DefinitelyTyped/DefinitelyTyped.git","vendorUrl":"https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/debug"}},"@types/lodash.debounce@npm:4.0.9::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Flodash.debounce%2F-%2Flodash.debounce-4.0.9.tgz":{"value":{"locator":"@types/lodash.debounce@npm:4.0.9::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Flodash.debounce%2F-%2Flodash.debounce-4.0.9.tgz","descriptor":"@types/lodash.debounce@npm:^4"},"children":{"url":"https://github.com/DefinitelyTyped/DefinitelyTyped.git","vendorUrl":"https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/lodash.debounce"}},"@types/lodash.throttle@npm:4.1.9::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Flodash.throttle%2F-%2Flodash.throttle-4.1.9.tgz":{"value":{"locator":"@types/lodash.throttle@npm:4.1.9::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Flodash.throttle%2F-%2Flodash.throttle-4.1.9.tgz","descriptor":"@types/lodash.throttle@npm:^4"},"children":{"url":"https://github.com/DefinitelyTyped/DefinitelyTyped.git","vendorUrl":"https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/lodash.throttle"}},"@types/node@npm:22.10.2::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Fnode%2F-%2Fnode-22.10.2.tgz":{"value":{"locator":"@types/node@npm:22.10.2::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Fnode%2F-%2Fnode-22.10.2.tgz","descriptor":"@types/node@npm:^22.10.2"},"children":{"url":"https://github.com/DefinitelyTyped/DefinitelyTyped.git","vendorUrl":"https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node"}},"@types/react@npm:18.3.3::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Freact%2F-%2Freact-18.3.3.tgz":{"value":{"locator":"@types/react@npm:18.3.3::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2F%40types%2Freact%2F-%2Freact-18.3.3.tgz","descriptor":"@types/react@npm:18.3.3"},"children":{"url":"https://github.com/DefinitelyTyped/DefinitelyTyped.git","vendorUrl":"https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react"}},"debug@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:4.3.7::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fdebug%2F-%2Fdebug-4.3.7.tgz":{"value":{"locator":"debug@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:4.3.7::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fdebug%2F-%2Fdebug-4.3.7.tgz","descriptor":"debug@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:^4.3.7"},"children":{"url":"git://github.com/debug-js/debug.git","vendorName":"Josh Junon","vendorUrl":"https://github.com/qix-"}},"es-toolkit@npm:1.26.1::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fes-toolkit%2F-%2Fes-toolkit-1.26.1.tgz":{"value":{"locator":"es-toolkit@npm:1.26.1::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fes-toolkit%2F-%2Fes-toolkit-1.26.1.tgz","descriptor":"es-toolkit@npm:^1.26.1"},"children":{"url":"https://github.com/toss/es-toolkit.git","vendorUrl":"https://es-toolkit.slash.page"}},"esbuild@npm:0.24.0::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fesbuild%2F-%2Fesbuild-0.24.0.tgz":{"value":{"locator":"esbuild@npm:0.24.0::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fesbuild%2F-%2Fesbuild-0.24.0.tgz","descriptor":"esbuild@npm:^0.24.0"},"children":{"url":"git+https://github.com/evanw/esbuild.git"}},"eslint@npm:9.7.0::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Feslint%2F-%2Feslint-9.7.0.tgz":{"value":{"locator":"eslint@npm:9.7.0::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Feslint%2F-%2Feslint-9.7.0.tgz","descriptor":"eslint@npm:^9.7.0"},"children":{"url":"git+https://github.com/eslint/eslint.git","vendorName":"Nicholas C. Zakas","vendorUrl":"https://eslint.org"}},"execa@npm:5.1.1::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fexeca%2F-%2Fexeca-5.1.1.tgz":{"value":{"locator":"execa@npm:5.1.1::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fexeca%2F-%2Fexeca-5.1.1.tgz","descriptor":"execa@npm:^5.0.0"},"children":{"url":"git+https://github.com/sindresorhus/execa.git","vendorName":"Sindre Sorhus","vendorUrl":"https://sindresorhus.com"}},"lodash.debounce@npm:4.0.8::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Flodash.debounce%2F-%2Flodash.debounce-4.0.8.tgz":{"value":{"locator":"lodash.debounce@npm:4.0.8::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Flodash.debounce%2F-%2Flodash.debounce-4.0.8.tgz","descriptor":"lodash.debounce@npm:^4.0.8"},"children":{"url":"git+https://github.com/lodash/lodash.git","vendorName":"John-David Dalton","vendorUrl":"https://lodash.com/"}},"lodash.throttle@npm:4.1.1::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Flodash.throttle%2F-%2Flodash.throttle-4.1.1.tgz":{"value":{"locator":"lodash.throttle@npm:4.1.1::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Flodash.throttle%2F-%2Flodash.throttle-4.1.1.tgz","descriptor":"lodash.throttle@npm:^4.1.1"},"children":{"url":"git+https://github.com/lodash/lodash.git","vendorName":"John-David Dalton","vendorUrl":"https://lodash.com/"}},"react@npm:18.2.0::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Freact%2F-%2Freact-18.2.0.tgz":{"value":{"locator":"react@npm:18.2.0::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Freact%2F-%2Freact-18.2.0.tgz","descriptor":"react@npm:18.2.0"},"children":{"url":"https://github.com/facebook/react.git","vendorUrl":"https://reactjs.org/"}},"react-native@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:0.72.6::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Freact-native%2F-%2Freact-native-0.72.6.tgz":{"value":{"locator":"react-native@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:0.72.6::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Freact-native%2F-%2Freact-native-0.72.6.tgz","descriptor":"react-native@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:0.72.6"},"children":{"url":"git+https://github.com/facebook/react-native.git"}},"react-native-url-polyfill@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:1.3.0::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Freact-native-url-polyfill%2F-%2Freact-native-url-polyfill-1.3.0.tgz":{"value":{"locator":"react-native-url-polyfill@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:1.3.0::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Freact-native-url-polyfill%2F-%2Freact-native-url-polyfill-1.3.0.tgz","descriptor":"react-native-url-polyfill@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:1.3.0"},"children":{"url":"https://github.com/charpeni/react-native-url-polyfill.git","vendorName":"Nicolas Charpentier","vendorUrl":"https://github.com/charpeni/react-native-url-polyfill"}},"vitest@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:2.1.8::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fvitest%2F-%2Fvitest-2.1.8.tgz":{"value":{"locator":"vitest@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:2.1.8::__archiveUrl=http%3A%2F%2F%2Frepository%2Fnpm-group%2Fvitest%2F-%2Fvitest-2.1.8.tgz","descriptor":"vitest@virtual:0f7211e995349a0590b75c29c2c512fe56a29503f5041a13b6188c4f65ee99e777df672ba8273eeded2a981b34773eb1332be08189c926a974d5810e49a633cf#npm:^2.1.8"},"children":{"url":"git+https://github.com/vitest-dev/vitest.git","vendorName":"Anthony Fu","vendorUrl":"https://github.com/vitest-dev/vitest#readme"}}}}
{"value":"UNKNOWN","children":{"@@granite-js/react-native/cli@workspace:packages/cli":{"value":{"locator":"@@granite-js/react-native/cli@workspace:packages/cli","descriptor":"@@granite-js/react-native/cli@workspace:*"},"children":{}},"@@granite-js/react-native/image@workspace:packages/image":{"value":{"locator":"@@granite-js/react-native/image@workspace:packages/image","descriptor":"@@granite-js/react-native/image@workspace:*"},"children":{}},"@@granite-js/react-native/jest-next@workspace:packages/jest-next":{"value":{"locator":"@@granite-js/react-native/jest-next@workspace:packages/jest-next","descriptor":"@@granite-js/react-native/jest-next@workspace:*"},"children":{}},"@@granite-js/react-native/lottie@workspace:packages/lottie":{"value":{"locator":"@@granite-js/react-native/lottie@workspace:packages/lottie","descriptor":"@@granite-js/react-native/lottie@workspace:*"},"children":{}},"@@granite-js/react-native/mpack-next@workspace:packages/mpack-next":{"value":{"locator":"@@granite-js/react-native/mpack-next@workspace:packages/mpack-next","descriptor":"@@granite-js/react-native/mpack-next@workspace:*"},"children":{}},"@@granite-js/react-native/native@workspace:packages/native":{"value":{"locator":"@@granite-js/react-native/native@workspace:packages/native","descriptor":"@@granite-js/react-native/native@workspace:*"},"children":{}},"@@granite-js/react-native/style-utils@workspace:packages/style-utils":{"value":{"locator":"@@granite-js/react-native/style-utils@workspace:packages/style-utils","descriptor":"@@granite-js/react-native/style-utils@workspace:*"},"children":{}},"@@granite-js/react-native/tools@workspace:packages/tools":{"value":{"locator":"@@granite-js/react-native/tools@workspace:packages/tools","descriptor":"@@granite-js/react-native/tools@workspace:*"},"children":{}},"@granite-js/react-native@workspace:packages/@granite-js/react-native":{"value":{"locator":"@granite-js/react-native@workspace:packages/@granite-js/react-native","descriptor":"@granite-js/react-native@workspace:packages/@granite-js/react-native"},"children":{}}}}
{"value":"Apache-2.0","children":{"typescript@patch:typescript@npm%3A4.9.5%3A%3A__archiveUrl=http%253A%252F%252F%252Frepository%252Fnpm-group%252Ftypescript%252F-%252Ftypescript-4.9.5.tgz#optional!builtin<compat/typescript>::version=4.9.5&hash=289587":{"value":{"locator":"typescript@patch:typescript@npm%3A4.9.5%3A%3A__archiveUrl=http%253A%252F%252F%252Frepository%252Fnpm-group%252Ftypescript%252F-%252Ftypescript-4.9.5.tgz#optional!builtin<compat/typescript>::version=4.9.5&hash=289587","descriptor":"typescript@patch:typescript@npm%3A4.9.5#optional!builtin<compat/typescript>"},"children":{"url":"https://github.com/Microsoft/TypeScript.git","vendorName":"Microsoft Corp.","vendorUrl":"https://www.typescriptlang.org/"}}}}
`;

  it('should parse licenses', () => {
    const licenses = parseLicenses(stdout);
    console.log(licenses);
    expect(licenses).toEqual([
      {
        packageName: '@babel/core',
        licenseName: 'MIT',
        repository: 'https://github.com/babel/babel.git',
      },
      {
        licenseName: 'MIT',
        packageName: '@babel/preset-env',
        repository: 'https://github.com/babel/babel.git',
      },
      {
        licenseName: 'MIT',
        packageName: '@babel/preset-typescript',
        repository: 'https://github.com/babel/babel.git',
      },
      {
        packageName: '@types/babel__core',
        licenseName: 'MIT',
        repository: 'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
      },
      {
        packageName: '@types/babel__preset-env',
        licenseName: 'MIT',
        repository: 'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
      },
      {
        packageName: '@types/debug',
        licenseName: 'MIT',
        repository: 'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
      },
      {
        packageName: '@types/lodash.debounce',
        licenseName: 'MIT',
        repository: 'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
      },
      {
        packageName: '@types/lodash.throttle',
        licenseName: 'MIT',
        repository: 'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
      },
      {
        packageName: '@types/node',
        licenseName: 'MIT',
        repository: 'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
      },
      {
        packageName: '@types/react',
        licenseName: 'MIT',
        repository: 'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
      },
      {
        licenseName: 'MIT',
        packageName: 'debug',
        repository: 'git://github.com/debug-js/debug.git',
      },
      {
        packageName: 'es-toolkit',
        licenseName: 'MIT',
        repository: 'https://github.com/toss/es-toolkit.git',
      },
      {
        packageName: 'esbuild',
        licenseName: 'MIT',
        repository: 'git+https://github.com/evanw/esbuild.git',
      },
      {
        packageName: 'eslint',
        licenseName: 'MIT',
        repository: 'git+https://github.com/eslint/eslint.git',
      },
      {
        packageName: 'execa',
        licenseName: 'MIT',
        repository: 'git+https://github.com/sindresorhus/execa.git',
      },
      {
        packageName: 'lodash.debounce',
        licenseName: 'MIT',
        repository: 'git+https://github.com/lodash/lodash.git',
      },
      {
        packageName: 'lodash.throttle',
        licenseName: 'MIT',
        repository: 'git+https://github.com/lodash/lodash.git',
      },
      {
        packageName: 'react',
        licenseName: 'MIT',
        repository: 'https://github.com/facebook/react.git',
      },
      {
        licenseName: 'MIT',
        packageName: 'react-native',
        repository: 'git+https://github.com/facebook/react-native.git',
      },
      {
        licenseName: 'MIT',
        packageName: 'react-native-url-polyfill',
        repository: 'https://github.com/charpeni/react-native-url-polyfill.git',
      },
      {
        licenseName: 'MIT',
        packageName: 'vitest',
        repository: 'git+https://github.com/vitest-dev/vitest.git',
      },
      {
        packageName: '@@granite-js/react-native/cli',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: '@@granite-js/react-native/image',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: '@@granite-js/react-native/jest-next',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: '@@granite-js/react-native/lottie',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: '@@granite-js/react-native/mpack-next',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: '@@granite-js/react-native/native',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: '@@granite-js/react-native/style-utils',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: '@@granite-js/react-native/tools',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: '@granite-js/react-native',
        licenseName: 'UNKNOWN',
        repository: null,
      },
      {
        packageName: 'typescript',
        licenseName: 'Apache-2.0',
        repository: 'https://github.com/Microsoft/TypeScript.git',
      },
    ]);
  });
});
