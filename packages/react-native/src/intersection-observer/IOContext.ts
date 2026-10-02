import { createContext } from 'react';
import IOManager from './IOManager';

export interface IOContextValue {
  manager: null | IOManager;
  /**
   * The enclosing `IOContext` value, if this scroll container is nested inside another
   * `IOScrollView`/`IOFlatList`. This forms a linked list from the innermost scroll
   * container up to the outermost one, allowing `InView` to observe every ancestor
   * viewport (like the web `IntersectionObserver`, which clips against all ancestors).
   */
  parent?: IOContextValue | null;
}

/**
 * @name IOContext
 * @description Context that shares the IOManager instance.
 */
const IOContext = createContext<IOContextValue>({
  manager: null,
  parent: null,
});

export default IOContext;
