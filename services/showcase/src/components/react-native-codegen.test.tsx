import { render, screen } from '@testing-library/react-native';
import { codegenNativeCommands, codegenNativeComponent } from 'react-native';
import * as RendererProxy from 'react-native/Libraries/ReactNative/RendererProxy';
import codegenNativeCommandsSubpath from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponentSubpath from 'react-native/Libraries/Utilities/codegenNativeComponent';
import { beforeEach, describe, expect, it } from 'vitest';

describe('react-native codegen helpers', () => {
  beforeEach(() => {
    ((RendererProxy as any).dispatchCommand as { mockClear: () => void }).mockClear();
  });

  it('keeps top-level and subpath codegen helpers aligned and renders generated components', () => {
    expect(codegenNativeComponent).toBe(codegenNativeComponentSubpath);
    expect(codegenNativeCommands).toBe(codegenNativeCommandsSubpath);

    const GeneratedView = codegenNativeComponentSubpath<any>('GraniteCodegenView');

    render(<GeneratedView testID="codegen-native-view">Codegen Ready</GeneratedView>);

    expect(screen.getByTestId('codegen-native-view')).toBeTruthy();
  });

  it('routes generated commands through RendererProxy.dispatchCommand', () => {
    const commands = codegenNativeCommandsSubpath<{
      play: (ref: unknown, source: string) => void;
    }>({
      supportedCommands: ['play'],
    });
    const ref = { current: { _nativeTag: 42 } };

    commands.play(ref, 'intro.mp4');

    expect((RendererProxy as any).dispatchCommand).toHaveBeenCalledWith(ref, 'play', ['intro.mp4']);
  });
});
