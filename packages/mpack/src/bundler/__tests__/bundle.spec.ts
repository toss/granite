import fs from 'fs';
import path from 'path';
import { parse as swcParse, Statement, VariableDeclaration } from '@swc/core';
import { Visitor } from '@swc/core/Visitor';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { initializeFixture, type FixtureTestContext } from '../../testing/initializeFixture';

describe('bundle', () => {
  let context: FixtureTestContext;

  beforeEach(async () => {
    context = await initializeFixture();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  it('빌드할 수 있다.', async () => {
    const outfile = './out.js';
    const reactNativeVersion = '0.72.6';

    await context.installDependencies('react@18.2.0', `react-native@${reactNativeVersion}`);
    await context.loadFixtures(__dirname, 'default');
    await context.buildWithConfig({
      platform: 'ios',
      entry: './index.js',
      outfile,
    });

    const { stdout } = await context.$(`node`, [outfile]);

    expect(stdout.trim()).toBe(reactNativeVersion);
  });

  it('의존성을 다른 것으로 설정할 수 있다.', async () => {
    const outfile = './out.js';
    const nextReactNativeVersion = '0.76.0';

    await context.installDependencies(
      'react@18.2.0',
      'react-native@0.72.6',
      `react-native-0.76.0@npm:react-native@${nextReactNativeVersion}`
    );
    await context.loadFixtures(__dirname, 'alias');
    await context.buildWithConfig({
      platform: 'ios',
      entry: './index.js',
      outfile,
      resolver: {
        alias: [{ from: 'react-native', to: 'react-native-0.76.0' }],
      },
    });

    const { stdout } = await context.$(`node`, [outfile]);

    expect(stdout.trim()).toBe(nextReactNativeVersion);
  });

  it('banner를 설정할 수 있다.', async () => {
    const outfile = './out.js';
    const bannerJsContent = 'console.log("banner");';

    await context.installDependencies('react@18.2.0', 'react-native@0.72.6');
    await context.loadFixtures(__dirname, 'banner');
    await context.buildWithConfig({
      platform: 'ios',
      entry: './index.js',
      outfile: outfile,
      esbuild: {
        banner: {
          js: bannerJsContent,
        },
      },
    });

    const fileContent = await fs.promises.readFile(path.resolve(context.dir, outfile));

    expect(fileContent.toString()).toContain(bannerJsContent);
  });

  it.todo('React Native의 InitializeCore.js 의 경우에도 dependencyAliases에서 지정한 버전으로 지정한다.');

  it('let/const 구문이 변환된다', async () => {
    const outfile = './out.js';

    await context.installDependencies('react@18.2.0', 'react-native@0.72.6');
    await context.loadFixtures(__dirname, 'es6');
    await context.buildWithConfig({
      platform: 'ios',
      entry: './index.js',
      outfile,
    });

    const content = await context.readFile(outfile);
    const parsed = await swcParse(content, {
      syntax: 'ecmascript',
      script: true,
      target: 'es2022',
      isModule: false,
    });

    function hasLetOrConst(body: Statement[]) {
      let hasLetOrConst = false;

      class LetOrConstVisitor extends Visitor {
        visitVariableDeclaration(declaration: VariableDeclaration): VariableDeclaration {
          if (declaration.kind === 'let' || declaration.kind === 'const') {
            hasLetOrConst = true;
          }

          return super.visitVariableDeclaration(declaration);
        }
      }

      const visitor = new LetOrConstVisitor();

      visitor.visitStatements(body);

      return hasLetOrConst;
    }

    await context.writeFile('./result.json', JSON.stringify(parsed.body, null, 2));

    expect(hasLetOrConst(parsed.body)).toBe(false);
  });

  it('Flow 구문이 모두 제거된다', async () => {
    const entry = './index.js';
    const outfile = './out.js';

    await context.installDependencies('react@18.2.0', 'react-native@0.72.6');
    await context.loadFixtures(__dirname, 'flow');
    await context.buildWithConfig({
      platform: 'ios',
      entry,
      outfile,
    });

    const { stdout } = await context.$(`node`, [outfile]);

    expect(stdout.trim()).toMatchInlineSnapshot(`"mul(10, 5) = 50"`);
  });
});
