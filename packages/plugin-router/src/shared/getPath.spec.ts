import { describe, it, expect } from 'vitest';
import { getPath } from './getPath';

describe('getPath', () => {
  it('pages/index.tsx', () => {
    const result = getPath('pages/index.tsx');
    expect(result).toMatch('/');
  });

  it('pages/index.ts', () => {
    const result = getPath('pages/index.ts');
    expect(result).toMatch('/');
  });

  it('pages/about.tsx', () => {
    const result = getPath('pages/about.tsx');
    expect(result).toMatch('/about');
  });

  it('pages/about.ts', () => {
    const result = getPath('pages/about.ts');
    expect(result).toMatch('/about');
  });

  it('pages/about/index.tsx', async () => {
    const result = getPath('pages/about/index.tsx');
    expect(result).toMatch('/about');
  });

  it('pages/about/name.tsx', async () => {
    const result = getPath('pages/about/name.tsx');
    expect(result).toMatch('/about/name');
  });

  it('pages/about/name.ts', async () => {
    const result = getPath('pages/about/name.ts');
    expect(result).toMatch('/about/name');
  });
});
