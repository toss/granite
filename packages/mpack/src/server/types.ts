import type { Middleware, BuildConfig } from '@granite-js/plugin-core';
import type { Bundler } from '../bundler';
import type { BuildStatusProgressBar } from '../utils/progressBar';

export type Platform = 'android' | 'ios';

export interface DevServerOptions {
  rootDir: string;
  host?: string;
  port?: number;
  buildConfig: Omit<BuildConfig, 'platform' | 'outfile'>;
  middlewares?: Middleware[];
}

export interface DevServerContext {
  rootDir: string;
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
  | 'log'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'debug'
  /**
   * In React Native, `error` type is not defined in ReportableEvent['level'],
   * Flipper supports `error` type, so we add it.
   *
   * @see {@link https://github.com/facebook/flipper/blob/v0.211.0/desktop/flipper-common/src/server-types.tsx#L76}
   */
  | 'error';

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
 * HMR WebSocket message type
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
