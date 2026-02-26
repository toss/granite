// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __DEV__: boolean;

/**
 * @see https://github.com/facebook/react-native/blob/v0.72.6/packages/assets/registry.js#L13-L24
 */
interface Asset {
  httpServerLocation: string;
  hash: string;
  name: string;
  type: string;
}

const IGNORE_PATH_PATTERN = [/react-native\/Libraries\/LogBox/, /@react-navigation\/elements/];

const assets = new Set();

function registerAsset(asset: Asset) {
  const key = getUniqueKey(asset);

  if (assets.has(key)) {
    return;
  }

  assets.add(key);
  warnUnableToUseLocalResources(asset);
}

function warnUnableToUseLocalResources(asset: Asset) {
  /**
   * Metro serves assets at `GET /assets/<file>` by default, so strip the leading prefix to extract the actual path.
   *
   * @see https://github.com/facebook/metro/blob/v0.72.3/packages/metro/src/Assets.js#L196-L198
   * @see https://github.com/facebook/metro/blob/v0.72.3/packages/metro-config/src/defaults/index.js#L122
   */
  const localPath = asset.httpServerLocation.replace(/^\/assets\//, '');
  const fileName = `${asset.name}.${asset.type}`;
  const shouldIgnore = IGNORE_PATH_PATTERN.some((pattern) => pattern.test(localPath));

  if (__DEV__ && !shouldIgnore) {
    console.warn(
      [
        '(DEV) Local resources are not supported. Please use remote resources via URI.',
        `Resource: ${localPath}/${fileName}`,
      ].join('\n')
    );
  }
}

function getUniqueKey(asset: Asset) {
  return `${asset.name}#${asset.hash}`;
}

function noop() {
  // noop
}

export { registerAsset, noop as getAssetByID };
