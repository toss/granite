import { describe, expect, it } from 'vitest';
import { createFlowStripStep } from './createFlowStripStep';
import type { TransformStepContext } from '../../../../transformer/TransformPipeline';

const CONTEXT: TransformStepContext = { key: 'key', mtimeMs: 0 };

async function strip(code: string, path = '/app/module.js') {
  const result = await createFlowStripStep()(code, { path }, CONTEXT);
  return result.code;
}

function importLines(code: string) {
  return code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('import'));
}

describe('createFlowStripStep', () => {
  it('removes an import containing only inline Flow type specifiers', async () => {
    const code = await strip(`/* @flow */
import {type NativeResponseType} from './XMLHttpRequest';
export const value: number = 1;
`);

    expect(code).not.toContain('./XMLHttpRequest');
    expect(importLines(code)).toEqual([]);
  });

  it('preserves genuine side-effect imports', async () => {
    const code = await strip(`/* @flow */
import './polyfill';
import 'react-native/setup';
console.log(1);
`);

    expect(importLines(code)).toEqual([`import './polyfill';`, `import 'react-native/setup';`]);
  });

  it('keeps value specifiers from mixed imports', async () => {
    const code = await strip(`/* @flow */
import convertRequestBody, {type RequestBody} from './convertRequestBody';
import React, {type Node, useState} from 'react';
export default function f() { return useState(convertRequestBody, React); }
`);

    expect(importLines(code)).toEqual([
      `import convertRequestBody from './convertRequestBody';`,
      `import React, { useState } from 'react';`,
    ]);
  });

  it('preserves a side-effect import beside a type-only import of the same module', async () => {
    const code = await strip(`/* @flow */
import {type Thing} from './thing';
import './thing';
export const value: number = 1;
`);

    expect(importLines(code)).toEqual([`import './thing';`]);
  });

  it('removes statement-level type and typeof imports', async () => {
    const code = await strip(`/* @flow */
import type {Other} from './Other';
import typeof Foo from './Foo';
export const value = 1;
`);

    expect(importLines(code)).toEqual([]);
  });

  it('leaves non-JavaScript files unchanged', async () => {
    const source = `import {type A} from './a';\n`;

    await expect(strip(source, '/app/module.ts')).resolves.toBe(source);
  });

  it('returns the original source when parsing fails', async () => {
    const source = 'const = = =;';

    await expect(strip(source)).resolves.toBe(source);
  });
});
