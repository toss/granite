import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getBundleName } from '../utils/getBundleName';

const TEMP_DIR = path.join(os.tmpdir(), 'mpack');

export const VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')).version;

export const REQUIRE_CONTEXT_PROTOCOL = 'require-context:';
export const PRELUDE_PROTOCOL = 'prelude:';

export const MPACK_DATA_DIR = path.join(TEMP_DIR, 'data');
export const MPACK_CACHE_DIR = path.join(TEMP_DIR, 'cache');

// 번들링시 처리할 파일 확장자
export const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.json'] as const;
export const ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] as const;

export const DEV_SERVER_DEFAULT_HOST = 'localhost';
export const DEV_SERVER_DEFAULT_PORT = 8081;

/**
 * 제거 필요: `SHARED_BUNDLE_NAME`, `SERVICE_BUNDLE_NAME` -> `BUNDLE_NAME`
 */
export const SHARED_BUNDLE_NAME = getBundleName('index');
export const SERVICE_BUNDLE_NAME = getBundleName('service');

export const BUNDLE_NAME = getBundleName('index');

export const DEBUGGER_FRONTEND_PATH = '/debugger-frontend';

export const RESOLVER_MAIN_FIELDS = ['react-native', 'browser', 'main'];
export const RESOLVER_EXPORTS_MAP_CONDITIONS = ['react-native'];

export const INTERNAL_NAMESPACE_IDENTIFIER = '__mpackInternal';
export const INTERNAL_LOAD_REMOTE_IDENTIFIER = 'loadRemote';
