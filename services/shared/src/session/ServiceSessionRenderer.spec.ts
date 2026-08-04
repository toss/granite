import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ServiceSessionRenderer Portal layout', () => {
  it('leaves Portal sizing to the native destination host', () => {
    const source = readFileSync(new URL('../pages/MainPage/MonoHermesMainPageTrack.tsx', import.meta.url), 'utf8');

    expect(source).not.toMatch(/<Portal[^>]*\sstyle=/);
  });
});
