import { describe, it, expect } from 'vitest';
import { getComponentName } from './getComponentName';

describe('getComponentName', () => {
  it('pages/index.tsx', () => {
    const result = getComponentName('pages/index.tsx');
    expect(result).toMatch('Index');
  });

  it('pages/about.tsx', () => {
    const result = getComponentName('pages/about.tsx');
    expect(result).toMatch('About');
  });

  it('pages/about/index.tsx', async () => {
    const result = getComponentName('pages/about/index.tsx');
    expect(result).toMatch('About');
  });

  it('pages/about/hi.tsx', async () => {
    const result = getComponentName('pages/about/hi.tsx');
    expect(result).toMatch('AboutHi');
  });

  it('pages/granite-module/share.tsx', async () => {
    const result = getComponentName('pages/granite-module/share.tsx');
    expect(result).toMatch('GraniteModuleShare');
  });
});
