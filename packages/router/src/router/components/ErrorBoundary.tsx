import { Component, type ReactNode } from 'react';
import type { ErrorComponent } from '../types';

interface ErrorBoundaryProps {
  fallback: ErrorComponent;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: unknown | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error != null) {
      const Fallback = this.props.fallback;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }

  private reset = () => {
    if (this.state.error == null) {
      return;
    }

    this.setState({ error: null });
  };
}
