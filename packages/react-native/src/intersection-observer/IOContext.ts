import { createContext } from 'react';
import IOManager from './IOManager';

export interface IOContextValue {
  manager: null | IOManager;
}

/**
 * @name IOContext
 * @description Context that shares the IOManager instance.
 */
const IOContext = createContext<IOContextValue>({
  manager: null,
});

export default IOContext;
