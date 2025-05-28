import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { initializeFixture, type FixtureTestContext } from '../../testing/initializeFixture';

describe('loadConfig', () => {
  let context: FixtureTestContext;

  beforeEach(async () => {
    context = await initializeFixture();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  it('config를 로드할 수 있다.', async () => {
    context.loadFixtures(__dirname, 'load-config');

    const { stdout } = await context.$(`node`, ['index.js']);

    expect(JSON.parse(stdout)).toMatchInlineSnapshot(`
      {
        "appName": "test",
        "concurrency": 4,
        "scheme": "test-scheme",
        "tasks": [
          {
            "build": {
              "entry": "./index.js",
              "esbuild": {
                "jsx": "automatic",
              },
              "outfile": "./out.js",
              "platform": "ios",
            },
            "tag": "foo",
          },
        ],
      }
    `);
  });
});
