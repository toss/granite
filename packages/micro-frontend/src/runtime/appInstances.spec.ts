import { afterEach, describe, expect, it } from 'vitest';
import {
  assignOwner,
  attachContainer,
  findOwnedCopy,
  findUnusedCopy,
  ownerOf,
  recordCopy,
  resetAppCopies,
  withPendingOwnerSync,
} from './appInstances';
import type { AppContainer } from './registry';

const container = (name: string) => ({ name }) as unknown as AppContainer;

function ready(instanceId: string, sourceUrl: string) {
  recordCopy(instanceId, 'shopping', sourceUrl);
  attachContainer(instanceId, container(instanceId));
}

afterEach(() => {
  resetAppCopies();
});

describe('app instances', () => {
  it('gives an instance to the session that waited for it from its first module on', () => {
    withPendingOwnerSync('shopping', 's1', () => recordCopy('shopping@1', 'shopping', 'v1'));
    recordCopy('shopping@2', 'shopping', 'v1');

    expect(ownerOf('shopping@1')).toBe('s1');
    expect(ownerOf('shopping@2')).toBeUndefined();
  });

  it('offers only unused instances of the newest bundle source, oldest first', () => {
    ready('shopping@1', 'v1');
    ready('shopping@2', 'v2');
    ready('shopping@3', 'v2');
    expect(findUnusedCopy('shopping')?.instanceId).toBe('shopping@2');

    assignOwner(findUnusedCopy('shopping')!, 's1');
    expect(findUnusedCopy('shopping')?.instanceId).toBe('shopping@3');
    expect(findOwnedCopy('shopping', 's1')?.instanceId).toBe('shopping@2');
  });

  it('never hands an instance to another session, also after its session closed', () => {
    ready('shopping@1', 'v1');
    const copy = findUnusedCopy('shopping')!;
    assignOwner(copy, 's1');

    expect(() => assignOwner(copy, 's2')).toThrow('already belongs to session s1');
    expect(findUnusedCopy('shopping')).toBeUndefined();
  });

  it('does not offer an instance whose modules never registered their container', () => {
    recordCopy('shopping@1', 'shopping', 'v1');
    expect(findUnusedCopy('shopping')).toBeUndefined();
  });
});
