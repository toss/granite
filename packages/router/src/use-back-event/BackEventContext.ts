import { createContext } from 'react';
import type { BackEvent, BackEventControls, BackEventHandler } from './useBackEvent';
import type { BackHandlerCallback, BackHandlerControls } from './useBackHandler';

export interface PrivateBackEventControls extends BackEventControls {
  handlersRef: Set<BackEventHandler>;
  hasBackEvent: boolean;
  hasBackHandler: boolean;
  addBackHandler: BackHandlerControls['addEventListener'];
  removeBackHandler: (...handlers: Array<BackHandlerCallback>) => void;
  onBack: () => void;
  onBackHandler: (event: BackEvent) => boolean;
}

export type BackEventActionsContextValue = Omit<
  PrivateBackEventControls,
  'handlersRef' | 'hasBackEvent' | 'hasBackHandler'
>;

export type BackEventStateContextValue = Pick<
  PrivateBackEventControls,
  'handlersRef' | 'hasBackEvent' | 'hasBackHandler'
>;

export const BackEventActionsContext = createContext<BackEventActionsContextValue | null>(null);
export const BackEventStateContext = createContext<BackEventStateContextValue | null>(null);
