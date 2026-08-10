import {
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { MicroFrontendSessionProvider } from './MicroFrontendSessionContext';

export interface MicroFrontendAppProps {
  readonly scheme: string;
  readonly presentationVisibility?: boolean;
}

export interface MicroFrontendSessionRendererProps {
  readonly app:
    | ComponentType<MicroFrontendAppProps>
    | LazyExoticComponent<ComponentType<MicroFrontendAppProps>>;
  readonly sessionId: string;
  readonly scheme: string;
  readonly isVisible: boolean;
  readonly close: () => Promise<void>;
  readonly fallback?: ReactNode;
}

export function MicroFrontendSessionRenderer({
  app: App,
  sessionId,
  scheme,
  isVisible,
  close,
  fallback = null,
}: MicroFrontendSessionRendererProps): ReactElement {
  return (
    <MicroFrontendSessionProvider sessionId={sessionId} close={close}>
      <Suspense fallback={fallback}>
        <App scheme={scheme} presentationVisibility={isVisible} />
      </Suspense>
    </MicroFrontendSessionProvider>
  );
}
