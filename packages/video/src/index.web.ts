import Video from './GraniteVideo.web';

export { Video };
export default Video;

export async function clearCache(): Promise<void> {}

export async function getWidevineLevel(): Promise<number> {
  return 0;
}

export async function isCodecSupported(_mimeType: string, _width: number, _height: number): Promise<boolean> {
  return false;
}

export async function isHEVCSupported(): Promise<boolean> {
  return false;
}

export * from './types';
export type { NativeProps, NativeCommands } from './GraniteVideoNativeComponent.web';
