import { describe, expect, it } from 'vitest';
import { createSessionRuntimeFixture } from '../../test/sessionRuntimeFixture';
import { getExecutionContext } from '../execution/context';
import { getExecutionSessions } from '../execution/sessions';

describe('native execution lifecycle', () => {
  it('captures bundle evaluation ownership before handing work to the native JS queue', async () => {
    const fixture = createSessionRuntimeFixture();
    const context = getExecutionContext();
    const first = context.run({ id: 'evaluation:a' }, () => fixture.runtime.evaluateScript('/a.hbc'));
    const second = context.run({ id: 'evaluation:b' }, () => fixture.runtime.evaluateScript('/b.hbc'));
    await Promise.all([first, second]);
    await fixture.runtime.evaluateScript('/host.hbc');
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenNthCalledWith(1, {
      filePath: '/a.hbc', executionId: 'evaluation:a',
    });
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenNthCalledWith(2, {
      filePath: '/b.hbc', executionId: 'evaluation:b',
    });
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenNthCalledWith(3, { filePath: '/host.hbc' });
    expect(context.capture()).toBeNull();
  });

  it('binds ownership before notifying React and ignores a close for an older lifetime', () => {
    const fixture = createSessionRuntimeFixture();
    const executions = getExecutionSessions();
    const context = getExecutionContext();
    const observed: Array<string | null> = [];
    const subscription = fixture.runtime.onSessionsChanged(() => {
      observed.push(executions.get('lifecycle-session')?.id ?? null);
    });
    const open = (executionId: string) => fixture.emit({
      name: 'openApp', params: { appName: 'example', scheme: 'example://screen', sessionId: 'lifecycle-session', executionId },
    });
    open('lifecycle:1');
    const first = executions.get('lifecycle-session');
    const delayed = context.run(first, () => context.snapshot().bind(() => context.capture()));
    fixture.emit({ name: 'closeApp', params: { sessionId: 'lifecycle-session', executionId: 'lifecycle:1' } });
    open('lifecycle:2');
    fixture.emit({ name: 'closeApp', params: { sessionId: 'lifecycle-session', executionId: 'lifecycle:1' } });
    expect(fixture.runtime.getSessions()).toHaveLength(1);
    expect(executions.get('lifecycle-session')?.id).toBe('lifecycle:2');
    expect(delayed()).toBe(first);
    expect(observed).toEqual(['lifecycle:1', null, 'lifecycle:2']);
    fixture.emit({ name: 'closeApp', params: { sessionId: 'lifecycle-session', executionId: 'lifecycle:2' } });
    expect(fixture.runtime.getSessions()).toHaveLength(0);
    subscription.remove();
  });
});
