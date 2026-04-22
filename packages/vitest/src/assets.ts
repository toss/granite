export const REACT_NATIVE_ASSET_EXTENSIONS = [
  'bmp',
  'gif',
  'jpg',
  'jpeg',
  'mp4',
  'png',
  'psd',
  'svg',
  'webp',
] as const;

export const REACT_NATIVE_ASSET_MODULE_ID_PATTERN = new RegExp(
  `\\.(${REACT_NATIVE_ASSET_EXTENSIONS.join('|')})(?:[?#].*)?$`,
  'i',
);
