import * as babel from '@babel/core';
import { describe, it, expect } from 'vitest';
import plugin from './babel.js';

describe('babel plugin', () => {
  it('should replace import.meta.env.<PROPERTY> with global.__granite.meta.env.<PROPERTY>', () => {
    const code = ['global.__granite.meta.env;', 'import.meta.env.MY_VAL;', `import.meta.env['MY_VAL'];`].join('\n');
    const result = babel.transform(code, { plugins: [plugin] });
    expect(result?.code).toMatchInlineSnapshot(`
      "global.__granite.meta.env;
      global.__granite.meta.env.MY_VAL;
      global.__granite.meta.env['MY_VAL'];"
    `);
  });

  it('should skip if the node is not import.meta.env.<PROPERTY>', () => {
    const code = ['import.meta.foo.MY_VAL;', `import.meta.foo['MY_VAL'];`].join('\n');
    const result = babel.transform(code, { plugins: [plugin] });
    expect(result?.code).toBe(code);
    expect(result?.code).toMatchInlineSnapshot(`
      "import.meta.foo.MY_VAL;
      import.meta.foo['MY_VAL'];"
    `);
  });
});
