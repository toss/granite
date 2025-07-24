import type { FastifyPluginAsync, FastifyPluginCallback } from 'fastify';
import type { Bundler } from '../bundler';
import type { DevServerConfig } from '../types';
import type { BuildStatusProgressBar } from '../utils/progressBar';

export type Platform = 'android' | 'ios';

export interface DevServerOptions extends DevServerConfig {
  rootDir: string;
  appName: string;
  scheme: string;
  host?: string;
  port?: number;
  plugins?: DevServerPlugin[];
}

export interface DevServerContext {
  rootDir: string;
  config: DevServerConfig;
  android: {
    bundler: Bundler;
    progressBar: BuildStatusProgressBar;
  };
  ios: {
    bundler: Bundler;
    progressBar: BuildStatusProgressBar;
  };
}

type ClientLogLevel =
  | 'trace'
  | 'info'
  | 'warn'
  /**
   * React Native 에는 ReportableEvent['level'] 에 `error` 타입이 정의되어있지 않은데,
   * Flipper 에서는 error 타입을 지원하기에 이를 추가함.
   *
   * @see {@link https://github.com/facebook/flipper/blob/v0.211.0/desktop/flipper-common/src/server-types.tsx#L76}
   */
  | 'error'
  | 'log'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'debug';

/**
 * @see {@link https://github.com/facebook/metro/blob/v0.78.0/packages/metro/src/lib/reporting.js#L36}
 */
export interface ClientLogEvent {
  type: 'client_log';
  level: ClientLogLevel;
  data: unknown[];
  mode: 'BRIDGE' | 'NOBRIDGE';
}

/**
 * HMR 웹소켓 메시지 타입
 *
 * @see {@link https://github.com/facebook/metro/blob/v0.77.0/packages/metro-runtime/src/modules/types.flow.js#L68}
 */
export type HmrClientMessage = RegisterEntryPointsMessage | LogMessage | LogOptInMessage;

interface RegisterEntryPointsMessage {
  type: 'register-entrypoints';
  entryPoints: string[];
}

interface LogMessage {
  type: 'log';
  level: 'trace' | 'info' | 'warn' | 'log' | 'group' | 'groupCollapsed' | 'groupEnd' | 'debug';
  data: any[];
  mode: 'BRIDGE' | 'NOBRIDGE';
}

interface LogOptInMessage {
  type: 'log-opt-in';
}

export interface HmrUpdateMessage {
  type: 'update';
  body: HmrUpdate;
}

export interface HmrUpdateStartMessage {
  type: 'update-start';
  body: {
    isInitialUpdate: boolean;
  };
}

export interface HmrUpdateDoneMessage {
  type: 'update-done';
}

interface HmrUpdate {
  readonly added: HmrModule[];
  readonly deleted: number[];
  readonly modified: HmrModule[];
  isInitialUpdate: boolean;
  revisionId: string;
}

interface HmrModule {
  module: [number, string];
  sourceMappingURL: string | null;
  sourceURL: string | null;
}

/**
 * @see {@link https://github.com/react-native-community/cli/blob/v11.3.5/packages/cli-server-api/src/websocket/createEventsSocketEndpoint.ts#L18}
 * @see {@link https://github.com/react-native-community/cli/blob/v11.3.5/packages/cli-server-api/src/websocket/createEventsSocketEndpoint.ts#L179}
 */
export type BroadcastCommand = 'reload' | 'devMenu';

export interface MessageBroadcaster {
  (command: BroadcastCommand, params?: Record<string, unknown>): void;
}

export type DevServerPlugin = FastifyPluginCallback | FastifyPluginAsync;
