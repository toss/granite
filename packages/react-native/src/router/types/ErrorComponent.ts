import type { ComponentType } from 'react';

export interface ErrorComponentProps {
  error: unknown;
  reset: () => void;
}

export type ErrorComponent = ComponentType<ErrorComponentProps>;
