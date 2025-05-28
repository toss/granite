import { unstable_Device } from '@react-native/dev-middleware';
import * as ws from 'ws';

export class Device extends unstable_Device {
  constructor(id: string, name: string, app: string, socket: ws.WebSocket, projectRoot: string) {
    super(id, name, app, socket, projectRoot, null);
  }
}
