import { describe, expect, it } from 'vitest';
import { InvalidNativeComponentEventError } from './errors';
import { parseNativeComponentEvent } from './parseNativeComponentEvent';

describe('parseNativeComponentEvent', () => {
  it('parses the component session events', () => {
    expect(
      parseNativeComponentEvent({
        name: 'openComponent',
        params: {
          sessionId: 'component-1',
          componentName: 'Demo',
          props: { count: 1 },
          sizing: 'contentSize',
          bundleFilePath: '/bundles/demo.hbc',
        },
      })
    ).toEqual({
      name: 'openComponent',
      params: {
        sessionId: 'component-1',
        componentName: 'Demo',
        props: { count: 1 },
        sizing: 'contentSize',
        bundleFilePath: '/bundles/demo.hbc',
      },
    });

    expect(
      parseNativeComponentEvent({
        name: 'openComponent',
        params: { sessionId: 'component-1', componentName: 'Demo', props: {}, sizing: 'constrained' },
      })
    ).toEqual({
      name: 'openComponent',
      params: { sessionId: 'component-1', componentName: 'Demo', props: {}, sizing: 'constrained' },
    });

    expect(
      parseNativeComponentEvent({
        name: 'updateComponentProps',
        params: { sessionId: 'component-1', props: { count: 2 } },
      })
    ).toEqual({
      name: 'updateComponentProps',
      params: { sessionId: 'component-1', props: { count: 2 } },
    });

    expect(parseNativeComponentEvent({ name: 'closeComponent', params: { sessionId: 'component-1' } })).toEqual({
      name: 'closeComponent',
      params: { sessionId: 'component-1' },
    });
  });

  it('rejects unknown events and missing or invalid parameters', () => {
    expect(() => parseNativeComponentEvent({ name: 'unknown', params: { sessionId: 'component-1' } })).toThrow(
      InvalidNativeComponentEventError
    );
    expect(() =>
      parseNativeComponentEvent({
        name: 'openComponent',
        params: { sessionId: 'component-1', componentName: 'Demo', props: {}, sizing: 'stretch' },
      })
    ).toThrow(new InvalidNativeComponentEventError('openComponent', 'sizing'));
    expect(() =>
      parseNativeComponentEvent({
        name: 'openComponent',
        params: { sessionId: 'component-1', props: {}, sizing: 'contentHeight' },
      })
    ).toThrow(new InvalidNativeComponentEventError('openComponent', 'componentName'));
    expect(() =>
      parseNativeComponentEvent({ name: 'updateComponentProps', params: { sessionId: 'component-1' } })
    ).toThrow(new InvalidNativeComponentEventError('updateComponentProps', 'props'));
    expect(() => parseNativeComponentEvent({ name: 'closeComponent', params: { sessionId: '' } })).toThrow(
      new InvalidNativeComponentEventError('closeComponent', 'sessionId')
    );
  });
});
