interface BundleDetails {
  bundleType: string;
  dev: boolean;
  entryFile: string;
  minify: boolean;
  platform?: string;
  runtimeBytecodeVersion?: number;
}

type WatcherStatus =
  | {
      type: 'watchman_slow_command';
      timeElapsed: number;
      command: 'watch-project' | 'query';
    }
  | {
      type: 'watchman_slow_command_complete';
      timeElapsed: number;
      command: 'watch-project' | 'query';
    }
  | {
      type: 'watchman_warning';
      warning: unknown;
      command: 'watch-project' | 'query';
    };

type HealthCheckResult =
  | { type: 'error'; timeout: number; error: Error; watcher: string | null }
  | {
      type: 'success';
      timeout: number;
      timeElapsed: number;
      watcher: string | null;
    }
  | {
      type: 'timeout';
      timeout: number;
      watcher: string | null;
      pauseReason: string | null;
    };

export type ReportableEvent =
  | {
      port: number;
      hasReducedPerformance: boolean;
      type: 'initialize_started';
    }
  | {
      type: 'initialize_failed';
      port: number;
      error: Error;
    }
  | {
      type: 'initialize_done';
      port: number;
    }
  | {
      buildID: string;
      type: 'bundle_build_done';
    }
  | {
      buildID: string;
      type: 'bundle_build_failed';
    }
  | {
      type: 'bundle_save_log';
      message: string;
    }
  | {
      buildID: string;
      bundleDetails: BundleDetails;
      isPrefetch?: boolean;
      type: 'bundle_build_started';
    }
  | {
      error: Error;
      type: 'bundling_error';
    }
  | {
      type: 'dep_graph_loading';
      hasReducedPerformance: boolean;
    }
  | { type: 'dep_graph_loaded' }
  | {
      buildID: string;
      type: 'bundle_transform_progressed';
      transformedFileCount: number;
      totalFileCount: number;
    }
  | {
      type: 'cache_read_error';
      error: Error;
    }
  | {
      type: 'cache_write_error';
      error: Error;
    }
  | { type: 'transform_cache_reset' }
  | {
      type: 'worker_stdout_chunk';
      chunk: string;
    }
  | {
      type: 'worker_stderr_chunk';
      chunk: string;
    }
  | {
      type: 'hmr_client_error';
      error: Error;
    }
  | {
      type: 'client_log';
      level: 'trace' | 'info' | 'warn' | 'log' | 'group' | 'groupCollapsed' | 'groupEnd' | 'debug';
      data: Array<unknown>;
      mode: 'BRIDGE' | 'NOBRIDGE';
    }
  | {
      type: 'resolver_warning';
      message: string;
    }
  | {
      type: 'server_listening';
      port: number;
      address: string;
      family: string;
    }
  | {
      type: 'transformer_load_started';
    }
  | {
      type: 'transformer_load_done';
    }
  | {
      type: 'transformer_load_failed';
      error: Error;
    }
  | {
      type: 'watcher_health_check_result';
      result: HealthCheckResult;
    }
  | {
      type: 'watcher_status';
      status: WatcherStatus;
    };
