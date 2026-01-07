import mitt from 'mitt';
import type { HMRContext, HMRClientMessage, HMRCustomHandler, HMRCustomMessage, HMRServerMessage } from 'rollipop';

// @ts-ignore - internal module for rolldown
import { __exportAll, __reExport, __toCommonJS, __toESM } from 'rolldown:runtime';

interface Messenger {
  send(message: HMRClientMessage): void;
}

declare global {
  var __ROLLIPOP_CUSTOM_HMR_HANDLER__: HMRCustomHandler | undefined;
  var __rolldown_runtime__: ReactNativeDevRuntime;
  var __turboModuleProxy: (moduleName: string) => any;
  var globalEvalWithSourceUrl: (code: string, sourceURL?: string) => void;
  var nativeModuleProxy: Record<string, any>;
  var __ReactRefresh: any;
}

function isReactRefreshBoundary(moduleExports: Record<string, unknown>) {
  if (globalThis.__ReactRefresh.isLikelyComponentType(moduleExports)) {
    return true;
  }

  if (moduleExports === undefined || moduleExports === null || typeof moduleExports !== 'object') {
    return false;
  }

  var hasExports = false;
  var areAllExportsComponents = true;
  for (var key in moduleExports) {
    hasExports = true;

    if (key === '__esModule') {
      continue;
    }

    var exportValue = moduleExports[key];
    if (!globalThis.__ReactRefresh.isLikelyComponentType(exportValue)) {
      areAllExportsComponents = false;
    }
  }

  return hasExports && areAllExportsComponents;
}

let timer: number | null = null;
function enqueueUpdate() {
  if (timer) {
    return;
  }
  timer = setTimeout(() => {
    globalThis.__ReactRefresh.performReactRefresh();
    timer = null;
  }, 50);
}

class CustomModule {
  exportsHolder: { exports: any } = { exports: null };
  id;
  constructor(id: string) {
    this.id = id;
  }
  get exports() {
    return this.exportsHolder.exports;
  }
}

class CustomDevRuntime {
  constructor(private messenger: any) {}

  modules: Record<string, CustomModule> = {};

  createModuleHotContext(_moduleId: unknown) {
    throw new Error('createModuleHotContext should be implemented');
  }

  applyUpdates(_boundaries: unknown) {
    throw new Error('applyUpdates should be implemented');
  }

  registerModule(id: string, exportsHolder: any) {
    const module = new CustomModule(id);
    module.exportsHolder = exportsHolder;
    this.modules[id] = module;
    this.sendModuleRegisteredMessage(id);
  }

  loadExports(id: string) {
    const module = this.modules[id];
    if (module) {
      return module.exportsHolder.exports;
    } else {
      console.warn(`Module ${id} not found`);
      return {};
    }
  }

  createEsmInitializer = (fn: any, res: any) => () => (fn && (res = fn((fn = 0))), res);
  createCjsInitializer = (cb: any, mod: any) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
  __toESM = __toESM;
  __toCommonJS = __toCommonJS;
  __exportAll = __exportAll;
  __toDynamicImportESM = (isNodeMode: boolean) => (mod: any) => __toESM(mod.default, isNodeMode);
  __reExport = __reExport;
  cache: any[] = [];
  timeoutSetLength = 0;
  initialized = false;

  sendModuleRegisteredMessage = (() => {
    const self = this;

    return function sendModuleRegisteredMessage(module: any) {
      if (!self.messenger) {
        return;
      }
      self.cache.push(module);
      self.timeoutSetLength = self.cache.length;
      self.flushCache();
    };
  })();

  flushCache() {
    if (!this.initialized) {
      return;
    }

    if (this.cache.length > this.timeoutSetLength) {
      this.timeoutSetLength = this.cache.length;
      this.flushCache();
      return;
    }

    this.messenger.send({
      type: 'hmr:module-registered',
      modules: this.cache,
    });
    this.cache.length = 0;
    this.timeoutSetLength = 0;
  }
}

var BaseDevRuntime = CustomDevRuntime;

class ModuleHotContext implements HMRContext {
  private readonly removeListeners: (() => void)[] = [];
  acceptCallbacks: { deps: string[]; fn: (moduleExports: Record<string, any>[]) => void }[] = [];

  constructor(
    private moduleId: string,
    private socketHolder: SocketHolder
  ) {}

  get refresh() {
    return globalThis.__ReactRefresh;
  }

  get refreshUtils() {
    return {
      isReactRefreshBoundary: (exports: any) => {
        if (isReactRefreshBoundary(exports)) {
          return true;
        }

        // Enable React Refresh for Granite Route
        if (typeof exports.Route !== 'undefined' && typeof exports.Route._path === 'string') {
          return true;
        }

        return false;
      },
      enqueueUpdate,
    };
  }

  accept(...args: any[]) {
    if (args.length === 1) {
      const [cb] = args;
      const acceptingPath = this.moduleId;
      this.acceptCallbacks.push({
        deps: [acceptingPath],
        fn: cb,
      });
    } else if (args.length === 0) {
      // noop
    } else {
      throw new Error('Invalid arguments for `import.meta.hot.accept`');
    }
  }

  invalidate() {
    this.socketHolder.send(
      JSON.stringify({
        type: 'hmr:invalidate',
        moduleId: this.moduleId,
      } satisfies HMRClientMessage)
    );
  }

  on(event: string, listener: (...args: any[]) => void) {
    this.socketHolder.on(event, listener);
    this.removeListeners.push(() => this.socketHolder.off(event, listener));
  }

  off(event: string, listener: (...args: any[]) => void) {
    this.socketHolder.off(event, listener);
  }

  send(type: string, payload?: unknown) {
    this.socketHolder.send(JSON.stringify({ type, payload }));
  }

  cleanup() {
    for (const removeListener of this.removeListeners) {
      removeListener();
    }
    this.removeListeners.length = 0;
  }
}

class SocketHolder {
  private readonly queuedMessages: string[] = [];
  private readonly emitter = mitt();
  private _socket: WebSocket | null = null;
  private _origin: string | null = null;

  get socket() {
    return this._socket;
  }

  get origin() {
    return this._origin;
  }

  setup(socket: WebSocket, origin: string) {
    this._socket = socket;
    this._origin = origin;

    if (socket.readyState !== WebSocket.OPEN) {
      const handler = () => {
        this.flushQueuedMessages();
        removeListener();
      };

      const removeListener = () => {
        socket.removeEventListener('open', handler);
      };

      socket.addEventListener('open', handler);
    } else {
      this.flushQueuedMessages();
    }
  }

  on(event: string, listener: (payload?: unknown) => void) {
    this.emitter.on(event, listener);
  }

  off(event: string, listener: (payload?: unknown) => void) {
    this.emitter.off(event, listener);
  }

  emit(event: string, payload?: unknown) {
    this.emitter.emit(event, payload);
  }

  send(message: string) {
    if (this._socket == null || this._socket.readyState !== WebSocket.OPEN) {
      this.queuedMessages.push(message);
      return;
    }
    this.flushQueuedMessages();
    this._socket.send(message);
  }

  flushQueuedMessages() {
    if (this._socket == null) {
      return;
    }
    for (const message of this.queuedMessages) {
      this._socket.send(message);
    }
    this.queuedMessages.length = 0;
  }

  close() {
    if (this._socket == null) {
      return;
    }
    this._socket.close();
  }
}

class ReactNativeDevRuntime extends BaseDevRuntime {
  socketHolder: SocketHolder;
  moduleHotContexts = new Map<string, ModuleHotContext>();
  moduleHotContextsToBeUpdated = new Map<string, ModuleHotContext>();

  constructor() {
    const socketHolder = new SocketHolder();
    const messenger: Messenger = {
      send: (message) => socketHolder.send(JSON.stringify(message)),
    };
    super(messenger);
    this.socketHolder = socketHolder;
  }

  createModuleHotContext(moduleId: string) {
    const hotContext = new ModuleHotContext(moduleId, this.socketHolder);
    if (this.moduleHotContexts.has(moduleId)) {
      this.moduleHotContextsToBeUpdated.set(moduleId, hotContext);
    } else {
      this.moduleHotContexts.set(moduleId, hotContext);
    }
    return hotContext;
  }

  applyUpdates(boundaries: [string, string][]) {
    for (let [moduleId, _acceptedVia] of boundaries) {
      const hotContext = this.moduleHotContexts.get(moduleId);
      if (hotContext) {
        const acceptCallbacks = hotContext.acceptCallbacks;
        acceptCallbacks.filter((cb) => {
          cb.fn(this.modules[moduleId]?.exports);
        });
        hotContext.cleanup();
      }
    }
    this.moduleHotContextsToBeUpdated.forEach((hotContext, moduleId) => {
      this.moduleHotContexts.set(moduleId, hotContext);
    });
    this.moduleHotContextsToBeUpdated.clear();
  }

  setup(socket: WebSocket, origin: string) {
    if (this.socketHolder.socket != null) {
      console.warn('[HMR]: ReactNativeDevRuntime already setup');
      return;
    }

    this.socketHolder.setup(socket, origin);

    socket.addEventListener('message', (event: MessageEvent) => {
      const message = JSON.parse(event.data) as HMRServerMessage;

      if (isCustomHMRMessage(message)) {
        this.socketHolder.emit(message.type, message.payload);
        globalThis.__ROLLIPOP_CUSTOM_HMR_HANDLER__?.(socket, message);
        return;
      }

      switch (message.type) {
        case 'hmr:update':
          this.evaluate(message.code);
          break;

        case 'hmr:reload':
          this.reload();
          break;
      }
    });

    this.initialized = true;
    this.flushCache();
  }

  private evaluate(code: string, sourceURL?: string) {
    if (globalThis.globalEvalWithSourceUrl) {
      globalThis.globalEvalWithSourceUrl(code, sourceURL);
    } else {
      // oxlint-disable-next-line no-eval
      eval(code);
    }
  }

  private reload() {
    const moduleName = 'DevSettings';
    (globalThis.__turboModuleProxy
      ? globalThis.__turboModuleProxy(moduleName)
      : globalThis.nativeModuleProxy[moduleName]
    ).reload();
  }
}

function isCustomHMRMessage(message: unknown): message is HMRCustomMessage {
  if (typeof message !== 'object' || message == null) {
    return false;
  }

  if ('type' in message && typeof message.type === 'string' && message.type.startsWith('hmr:')) {
    return false;
  }

  return true;
}

globalThis.__rolldown_runtime__ = new ReactNativeDevRuntime();

export type { ReactNativeDevRuntime as DevRuntime };
