/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

import * as fs from 'fs';
import * as path from 'path';
import WS from 'ws';

const debug = require('debug')('Metro:InspectorProxy');

const PAGES_POLLING_INTERVAL = 1000;

// Android's stock emulator and other emulators such as genymotion use a standard localhost alias.
const EMULATOR_LOCALHOST_ADDRESSES = ['10.0.2.2', '10.0.3.2'];

// Prefix for script URLs that are alphanumeric IDs. See comment in _processMessageFromDevice method for
// more details.
const FILE_PREFIX = 'file://';

const REACT_NATIVE_RELOADABLE_PAGE_ID = '-1';

/**
 * Device class represents single device connection to Inspector Proxy. Each device
 * can have multiple inspectable pages.
 */
class Device {
  // ID of the device.
  _id;

  // Name of the device.
  _name;

  // Package name of the app.
  _app;

  // Stores socket connection between Inspector Proxy and device.
  _deviceSocket;

  // Stores last list of device's pages.
  _pages;

  // Stores information about currently connected debugger (if any).
  _debuggerConnection = null;

  // Last known Page ID of the React Native page.
  // This is used by debugger connections that don't have PageID specified
  // (and will interact with the latest React Native page).
  _lastConnectedReactNativePage = null;

  // Whether we are in the middle of a reload in the REACT_NATIVE_RELOADABLE_PAGE.
  _isReloading = false;

  // The previous "GetPages" message, for deduplication in debug logs.
  _lastGetPagesMessage = '';

  // Mapping built from scriptParsed events and used to fetch file content in `Debugger.getScriptSource`.
  _scriptIdToSourcePathMapping = new Map();

  // Root of the project used for relative to absolute source path conversion.
  _projectRoot;

  // MARK: - GRANITE
  _delegate;

  // MARK: - GRANITE
  // 네트워크 응답 데이터 저장하기 위한 변수 (key: requestId, value: { data: string, base64Encoded: bool })
  _networkResponseData = new Map();

  constructor(id, name, app, socket, projectRoot, delegate) {
    this._id = id;
    this._name = name;
    this._app = app;
    this._pages = [];
    this._deviceSocket = socket;
    this._projectRoot = projectRoot;
    this._delegate = delegate;

    this._deviceSocket.on('message', (message) => {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.event === 'getPages') {
        // There's a 'getPages' message every second, so only show them if they change
        if (message !== this._lastGetPagesMessage) {
          debug('(Debugger)    (Proxy) <- (Device), getPages ping has changed: ' + message);
          this._lastGetPagesMessage = message;
        }
      } else {
        debug('(Debugger)    (Proxy) <- (Device): ' + message);
      }
      this._handleMessageFromDevice(parsedMessage);
    });
    this._deviceSocket.on('close', () => {
      // Device disconnected - close debugger connection.
      if (this._debuggerConnection) {
        this._debuggerConnection.socket.close();
        this._debuggerConnection = null;
      }
    });

    this._setPagesPolling();
  }

  getName() {
    return this._name;
  }

  getPagesList() {
    if (this._lastConnectedReactNativePage) {
      const reactNativeReloadablePage = {
        id: REACT_NATIVE_RELOADABLE_PAGE_ID,
        title: 'React Native Experimental (Improved Chrome Reloads)',
        vm: "don't use",
        app: this._app,
      };
      return this._pages.concat(reactNativeReloadablePage);
    } else {
      return this._pages;
    }
  }

  // Handles new debugger connection to this device:
  // 1. Sends connect event to device
  // 2. Forwards all messages from the debugger to device as wrappedEvent
  // 3. Sends disconnect event to device when debugger connection socket closes.
  handleDebuggerConnection(socket, pageId) {
    // Disconnect current debugger if we already have debugger connected.
    if (this._debuggerConnection) {
      this._debuggerConnection.socket.close();
      this._debuggerConnection = null;
    }

    const debuggerInfo = {
      socket,
      prependedFilePrefix: false,
      pageId,
    };
    this._debuggerConnection = debuggerInfo;

    debug(`Got new debugger connection for page ${pageId} of ${this._name}`);

    this._sendMessageToDevice({
      event: 'connect',
      payload: {
        pageId: this._mapToDevicePageId(pageId),
      },
    });

    socket.on('message', (message) => {
      // MARK: - GRANITE
      if (!this._lastConnectedReactNativePage) {
        // 연결된 RN 인스턴스가 없는 경우 인스펙터로부터 받은 이벤트 발송하지 않도록 함
        return;
      }

      debug('(Debugger) -> (Proxy)    (Device): ' + message);
      const debuggerRequest = JSON.parse(message);
      const interceptedResponse = this._interceptMessageFromDebugger(debuggerRequest, debuggerInfo);

      if (interceptedResponse) {
        socket.send(JSON.stringify(interceptedResponse));
      } else {
        this._sendMessageToDevice({
          event: 'wrappedEvent',
          payload: {
            pageId: this._mapToDevicePageId(pageId),
            wrappedEvent: JSON.stringify(debuggerRequest),
          },
        });
      }
    });
    socket.on('close', () => {
      debug(`Debugger for page ${pageId} and ${this._name} disconnected.`);
      this._sendMessageToDevice({
        event: 'disconnect',
        payload: {
          pageId: this._mapToDevicePageId(pageId),
        },
      });
      this._debuggerConnection = null;
    });

    const sendFunc = socket.send;
    socket.send = function (message) {
      debug('(Debugger) <- (Proxy)    (Device): ' + message);
      return sendFunc.call(socket, message);
    };
  }

  // Handles messages received from device:
  // 1. For getPages responses updates local _pages list.
  // 2. All other messages are forwarded to debugger as wrappedEvent.
  //
  // In the future more logic will be added to this method for modifying
  // some of the messages (like updating messages with source maps and file
  // locations).
  _handleMessageFromDevice(message) {
    if (message.event === 'getPages') {
      this._pages = message.payload;

      // Check if device have new React Native page.
      // There is usually no more than 2-3 pages per device so this operation
      // is not expensive.
      // TODO(hypuk): It is better for VM to send update event when new page is
      // created instead of manually checking this on every getPages result.
      for (let i = 0; i < this._pages.length; ++i) {
        if (this._pages[i].title.indexOf('React') >= 0) {
          if (this._pages[i].id != this._lastConnectedReactNativePage?.id) {
            this._newReactNativePage(this._pages[i]);
            break;
          }
        }
      }
    } else if (message.event === 'disconnect') {
      // Device sends disconnect events only when page is reloaded or
      // if debugger socket was disconnected.
      const pageId = message.payload.pageId;
      const debuggerSocket = this._debuggerConnection ? this._debuggerConnection.socket : null;
      if (debuggerSocket && debuggerSocket.readyState === WS.OPEN) {
        if (this._debuggerConnection != null && this._debuggerConnection.pageId !== REACT_NATIVE_RELOADABLE_PAGE_ID) {
          debug(`Page ${pageId} is reloading.`);
          debuggerSocket.send(JSON.stringify({ method: 'reload' }));
        }
      }
    } else if (message.event === 'wrappedEvent') {
      if (this._debuggerConnection == null) {
        return;
      }

      // FIXME: Is it possible that we received message for pageID that does not
      // correspond to current debugger connection?

      const debuggerSocket = this._debuggerConnection.socket;
      if (debuggerSocket == null || debuggerSocket.readyState !== WS.OPEN) {
        // TODO(hypuk): Send error back to device?
        return;
      }

      const parsedPayload = JSON.parse(message.payload.wrappedEvent);

      if (this._debuggerConnection) {
        // Wrapping just to make flow happy :)
        this._processMessageFromDevice(parsedPayload, this._debuggerConnection);
      }

      const messageToSend = JSON.stringify(parsedPayload);
      debuggerSocket.send(messageToSend);
    }
  }

  // Sends single message to device.
  _sendMessageToDevice(message) {
    try {
      if (message.event !== 'getPages') {
        debug('(Debugger)    (Proxy) -> (Device): ' + JSON.stringify(message));
      }
      this._deviceSocket.send(JSON.stringify(message));
    } catch (error) {}
  }

  // Sends 'getPages' request to device every PAGES_POLLING_INTERVAL milliseconds.
  _setPagesPolling() {
    setInterval(() => this._sendMessageToDevice({ event: 'getPages' }), PAGES_POLLING_INTERVAL);
  }

  // We received new React Native Page ID.
  _newReactNativePage(page) {
    debug(`React Native page updated to ${page.id}`);
    if (this._debuggerConnection == null || this._debuggerConnection.pageId !== REACT_NATIVE_RELOADABLE_PAGE_ID) {
      // We can just remember new page ID without any further actions if no
      // debugger is currently attached or attached debugger is not
      // "Reloadable React Native" connection.
      this._lastConnectedReactNativePage = page;
      return;
    }
    const oldPageId = this._lastConnectedReactNativePage?.id;
    this._lastConnectedReactNativePage = page;
    this._isReloading = true;

    // We already had a debugger connected to React Native page and a
    // new one appeared - in this case we need to emulate execution context
    // detroy and resend Debugger.enable and Runtime.enable commands to new
    // page.

    if (oldPageId != null) {
      this._sendMessageToDevice({
        event: 'disconnect',
        payload: {
          pageId: oldPageId,
        },
      });
    }

    this._sendMessageToDevice({
      event: 'connect',
      payload: {
        pageId: page.id,
      },
    });

    const toSend = [
      { method: 'Runtime.enable', id: 1e9 },
      { method: 'Debugger.enable', id: 1e9 },
    ];

    for (const message of toSend) {
      this._sendMessageToDevice({
        event: 'wrappedEvent',
        payload: {
          pageId: this._mapToDevicePageId(page.id),
          wrappedEvent: JSON.stringify(message),
        },
      });
    }
  }

  // Allows to make changes in incoming message from device.
  _processMessageFromDevice(payload, debuggerInfo) {
    if (this._delegate?.onDeviceMessage?.(payload, debuggerInfo.socket)) {
      return;
    }

    // Replace Android addresses for scriptParsed event.
    if (payload.method === 'Debugger.scriptParsed') {
      const params = payload.params || {};
      if ('sourceMapURL' in params) {
        for (let i = 0; i < EMULATOR_LOCALHOST_ADDRESSES.length; ++i) {
          const address = EMULATOR_LOCALHOST_ADDRESSES[i];
          if (params.sourceMapURL.indexOf(address) >= 0) {
            payload.params.sourceMapURL = params.sourceMapURL.replace(address, 'localhost');
            debuggerInfo.originalSourceURLAddress = address;
          }
        }
      }
      if ('url' in params) {
        for (let i = 0; i < EMULATOR_LOCALHOST_ADDRESSES.length; ++i) {
          const address = EMULATOR_LOCALHOST_ADDRESSES[i];
          if (params.url.indexOf(address) >= 0) {
            payload.params.url = params.url.replace(address, 'localhost');
            debuggerInfo.originalSourceURLAddress = address;
          }
        }

        // Chrome doesn't download source maps if URL param is not a valid
        // URL. Some frameworks pass alphanumeric script ID instead of URL which causes
        // Chrome to not download source maps. In this case we want to prepend script ID
        // with 'file://' prefix.
        if (payload.params.url.match(/^[0-9a-z]+$/)) {
          payload.params.url = FILE_PREFIX + payload.params.url;
          debuggerInfo.prependedFilePrefix = true;
        }

        // $FlowFixMe[prop-missing]
        if (params.scriptId != null) {
          this._scriptIdToSourcePathMapping.set(params.scriptId, params.url);
        }
      }

      if (debuggerInfo.pageId == REACT_NATIVE_RELOADABLE_PAGE_ID) {
        // Chrome won't use the source map unless it appears to be new.
        if (payload.params.sourceMapURL) {
          payload.params.sourceMapURL += '&cachePrevention=' + this._mapToDevicePageId(debuggerInfo.pageId);
        }
        if (payload.params.url) {
          payload.params.url += '&cachePrevention=' + this._mapToDevicePageId(debuggerInfo.pageId);
        }
      }
    }

    if (payload.method === 'Runtime.executionContextCreated' && this._isReloading) {
      // The new context is ready. First notify Chrome that we've reloaded so
      // it'll resend its breakpoints. If we do this earlier, we may not be
      // ready to receive them.
      debuggerInfo.socket.send(JSON.stringify({ method: 'Runtime.executionContextsCleared' }));

      // The VM starts in a paused mode. Ask it to resume.
      // Note that if setting breakpoints in early initialization functions,
      // there's a currently race condition between these functions executing
      // and Chrome re-applying the breakpoints due to the message above.
      //
      // This is not an issue in VSCode/Nuclide where the IDE knows to resume
      // at its convenience.
      this._sendMessageToDevice({
        event: 'wrappedEvent',
        payload: {
          pageId: this._mapToDevicePageId(debuggerInfo.pageId),
          wrappedEvent: JSON.stringify({ method: 'Debugger.resume', id: 0 }),
        },
      });

      this._isReloading = false;
    }

    // MARK: - GRANITE
    // 네트워크 인스펙터에서 응답 데이터 미리보기를 구현하기 위한 커스텀 이벤트
    if (payload.method === 'Bedrock.networkResponseData' || payload.method === 'Granite.networkResponseData') {
      const params = payload.params ?? {};
      if (typeof params.requestId === 'string') {
        this._networkResponseData.set(params.requestId, {
          data: params.data,
          base64Encoded: params.base64Encoded,
        });
      }
    }
  }

  // Allows to make changes in incoming messages from debugger.
  _interceptMessageFromDebugger(req, debuggerInfo) {
    let response = null;

    if (this._delegate?.onDebuggerMessage?.(req, debuggerInfo.socket)) {
      return null;
    }

    if (req.method === 'Debugger.setBreakpointByUrl') {
      this._processDebuggerSetBreakpointByUrl(req, debuggerInfo);
    } else if (req.method === 'Debugger.getScriptSource') {
      response = {
        id: req.id,
        result: this._processDebuggerGetScriptSource(req),
      };
    } else if (req.method === 'Network.getResponseBody') {
      // MARK: - GRANITE
      response = this._processDebuggerGetResponseBody(req, debuggerInfo.socket);
    }
    return response;
  }

  // MARK: - GRANITE
  _processDebuggerGetResponseBody(req) {
    // `networkResponseData` 이벤트로부터 수신한 데이터를 꺼내 응답
    // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-getResponseBody
    const { requestId } = req.params;
    if (this._networkResponseData.has(requestId)) {
      const responseData = this._networkResponseData.get(requestId);
      this._networkResponseData.delete(requestId);
      return {
        id: req.id,
        result: this._createNetworkResponseData(responseData),
      };
    }
    return null;
  }

  // MARK: - GRANITE
  _createNetworkResponseData(responseData) {
    let parsedOriginalData;
    try {
      /**
       * 인코딩된 데이터인 경우 디코딩하여 JSON 형태의 값인지 확인
       */
      parsedOriginalData = JSON.parse(responseData.base64Encoded ? atob(responseData.data) : responseData.data);
    } catch {
      return {
        body: responseData.data,
        base64Encoded: responseData.base64Encoded,
      };
    }
    const body = typeof parsedOriginalData === 'object' ? JSON.stringify(parsedOriginalData) : responseData.data;
    return { body, base64Encoded: false };
  }

  _processDebuggerSetBreakpointByUrl(req, debuggerInfo) {
    // If we replaced Android emulator's address to localhost we need to change it back.
    if (debuggerInfo.originalSourceURLAddress) {
      if (req.params.url) {
        req.params.url = req.params.url.replace('localhost', debuggerInfo.originalSourceURLAddress);

        if (req.params.url && req.params.url.startsWith(FILE_PREFIX) && debuggerInfo.prependedFilePrefix) {
          // Remove fake URL prefix if we modified URL in _processMessageFromDevice.
          // $FlowFixMe[incompatible-use]
          req.params.url = req.params.url.slice(FILE_PREFIX.length);
        }
      }
      if (req.params.urlRegex) {
        req.params.urlRegex = req.params.urlRegex.replace(
          /localhost/g,
          // $FlowFixMe[incompatible-call]
          debuggerInfo.originalSourceURLAddress
        );
      }
    }
  }

  _processDebuggerGetScriptSource(req) {
    let scriptSource = `Source for script with id '${req.params.scriptId}' was not found.`;

    const pathToSource = this._scriptIdToSourcePathMapping.get(req.params.scriptId);
    if (pathToSource) {
      try {
        scriptSource = fs.readFileSync(path.resolve(this._projectRoot, pathToSource), 'utf8');
      } catch (err) {
        scriptSource = err.message;
      }
    }

    return {
      scriptSource,
    };
  }

  _mapToDevicePageId(pageId) {
    if (pageId === REACT_NATIVE_RELOADABLE_PAGE_ID && this._lastConnectedReactNativePage != null) {
      return this._lastConnectedReactNativePage.id;
    } else {
      return pageId;
    }
  }
}

module.exports = Device;
