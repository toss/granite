import { describe, expect, it } from 'vitest';
import { resolveMainPageTrack } from './mainPageTrack';

describe('resolveMainPageTrack', () => {
  it('activates the service-session track only when _monoHermes is true', () => {
    expect(resolveMainPageTrack({ _monoHermes: true })).toBe('serviceSession');
  });

  it.each([
    ['missing', {}],
    ['false', { _monoHermes: false }],
    ['string-like opt-in', { _monoHermes: 'true' }],
  ])('keeps the legacy track for %s', (_label, initialProps) => {
    expect(resolveMainPageTrack(initialProps)).toBe('legacy');
  });
});
