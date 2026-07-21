import { Component, type PropsWithChildren, type ReactNode } from 'react';

export interface ErrorBoundaryProps extends PropsWithChildren {
  readonly renderFallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    return this.state.error == null ? this.props.children : this.props.renderFallback(this.state.error);
  }
}
