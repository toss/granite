import { describe, it, expect } from 'vitest';
import { getPageName } from './getPageName';

describe('getPageName', () => {
  it('pages/_layout.tsx', () => {
    const result = getPageName('pages/_layout.tsx');
    expect(result).toMatch('');
  });

  it('pages/about/_layout.tsx', async () => {
    const result = getPageName('pages/about/_layout.tsx');
    expect(result).toMatch('About');
  });

  it('pages/granite-module/_layout.tsx', async () => {
    const result = getPageName('pages/granite-module/_layout.tsx');
    expect(result).toMatch('GraniteModule');
  });

  it('pages/granite-module/share/_layout.tsx', async () => {
    const result = getPageName('pages/granite-module/share/_layout.tsx');
    expect(result).toMatch('Share');
  });
});
