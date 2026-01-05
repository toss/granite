import * as ws from 'ws';

export class Device {
  private _id: string;
  private _name: string;
  private _app: string;
  private _socket: ws.WebSocket;
  private _projectRoot: string;
  private _debuggerConnection: any = null;

  constructor(id: string, name: string, app: string, socket: ws.WebSocket, projectRoot: string, _delegate: any) {
    this._id = id;
    this._name = name;
    this._app = app;
    this._socket = socket;
    this._projectRoot = projectRoot;
  }

  getName() {
    return this._name;
  }

  getId() {
    return this._id;
  }

  getApp() {
    return this._app;
  }

  getSocket() {
    return this._socket;
  }

  getProjectRoot() {
    return this._projectRoot;
  }

  handleDuplicateDeviceConnection(_newDevice: Device) {
    if (this._debuggerConnection) {
      this._debuggerConnection.socket?.close();
      this._debuggerConnection = null;
    }
  }

  handleDebuggerConnection(socket: ws.WebSocket, pageId: string, metadata: { userAgent: string | null }) {
    if (this._debuggerConnection) {
      this._debuggerConnection.socket?.close();
    }
    this._debuggerConnection = { socket, pageId, metadata };
  }
}
