import { Portal, type MicroFrontendRuntimeApi } from '@granite-js/micro-frontend';
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type ComponentProvider, type LayoutChangeEvent } from 'react-native';
import { getComponentSessionClient } from '../sessions/componentSessionClient';
import type { ComponentSessionClient } from '../sessions/createComponentSessionClient';
import type { RNComponentContentSize, RNComponentSessionState, RNComponentViewSizing } from '../types';
import {
  getRecordedComponentProvider,
  isComponentProviderRecorderInstalled,
  subscribeRecordedComponentProviders,
  type RecordedComponentProvider,
} from './componentProviderStore';
import { useComponentSessions } from './useComponentSessions';

type BundleRuntime = Pick<MicroFrontendRuntimeApi, 'evaluateScript'>;

export interface RNComponentViewRendererProps {
  /**
   * Evaluates the bundle a native view names before its component renders, once per runtime: pass the runtime that
   * `createMicroFrontendRuntime` returns. Without it, the components must register in the bundles this runtime has
   * already evaluated, and a view that names a bundle stays empty.
   */
  readonly runtime?: BundleRuntime;
}

/**
 * Renders the component of every `RNComponentView` open in the app into the Portal host inside that view, and reports
 * measured content sizes back to the views. Mount it once in the JavaScript runtime that renders the components, and
 * call `installComponentProviderRecorder()` before the components register.
 */
export function RNComponentViewRenderer({ runtime }: RNComponentViewRendererProps) {
  return <ComponentSessionsRenderer client={getComponentSessionClient()} runtime={runtime} />;
}

type RendererClient = Pick<ComponentSessionClient, 'getSessions' | 'onSessionsChanged' | 'reportContentSize'>;

interface ComponentSessionsRendererProps {
  readonly client: RendererClient;
  readonly runtime?: BundleRuntime;
}

/** @internal */
export function ComponentSessionsRenderer({ client, runtime }: ComponentSessionsRendererProps) {
  const sessions = useComponentSessions(client);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {sessions.map((session) => (
        <ComponentSession key={session.sessionId} client={client} runtime={runtime} session={session} />
      ))}
    </View>
  );
}

interface ComponentSessionProps {
  readonly client: RendererClient;
  readonly runtime?: BundleRuntime;
  readonly session: RNComponentSessionState;
}

function ComponentSession({ client, runtime, session }: ComponentSessionProps) {
  const bundleStatus = useEvaluatedComponentBundle(runtime, session);
  const recordedProvider = useRecordedComponentProvider(session.componentName);
  const isReady = bundleStatus === 'evaluated' && recordedProvider != null;

  useEffect(() => {
    if (bundleStatus !== 'evaluated' || recordedProvider != null) {
      return;
    }
    console.warn(
      isComponentProviderRecorderInstalled()
        ? `RNComponentView component '${session.componentName}' is not registered with AppRegistry`
        : `RNComponentView component '${session.componentName}' is unavailable: call installComponentProviderRecorder() before components register`
    );
  }, [bundleStatus, recordedProvider, session.componentName]);

  // The native view shows its placeholder until content attaches to the Portal host.
  if (!isReady) {
    return null;
  }

  return (
    <Portal hostName={session.sessionId} style={styles.portal}>
      <ComponentErrorBoundary componentName={session.componentName}>
        <MeasuredContent client={client} sessionId={session.sessionId} sizing={session.sizing}>
          <RecordedComponent
            // A component registered again under the same name remounts, as a new run would.
            key={recordedProvider.registrationKey}
            componentProvider={recordedProvider.componentProvider}
            props={session.props}
          />
        </MeasuredContent>
      </ComponentErrorBoundary>
    </Portal>
  );
}

function useRecordedComponentProvider(componentName: string): RecordedComponentProvider | undefined {
  return useSyncExternalStore(subscribeRecordedComponentProviders, () => getRecordedComponentProvider(componentName));
}

interface RecordedComponentProps {
  readonly componentProvider: ComponentProvider;
  readonly props: Readonly<Record<string, unknown>>;
}

/**
 * Renders the recorded component with the session props. It calls the provider once, as React Native does for each
 * run: a provider that wraps the component, like `() => codePush(App)`, returns a new type on every call, so calling it
 * on every render would remount the content whenever the props change. It renders inside the session's error
 * boundary, so a provider that throws empties only its own session.
 */
function RecordedComponent({ componentProvider, props }: RecordedComponentProps) {
  const [RegisteredComponent] = useState(() => componentProvider());
  return <RegisteredComponent {...props} />;
}

type ComponentBundleStatus = 'evaluating' | 'evaluated' | 'failed';

// Evaluating a bundle again redeclares its globals, so each runtime evaluates a bundle at most once, even after a
// failure.
const componentBundleEvaluations = new WeakMap<BundleRuntime, Map<string, Promise<void>>>();

function evaluateComponentBundleOnce(runtime: BundleRuntime, filePath: string): Promise<void> {
  let evaluations = componentBundleEvaluations.get(runtime);
  if (evaluations == null) {
    evaluations = new Map();
    componentBundleEvaluations.set(runtime, evaluations);
  }

  let evaluation = evaluations.get(filePath);
  if (evaluation == null) {
    evaluation = runtime.evaluateScript(filePath);
    evaluation.catch((error: unknown) => {
      console.error(`Failed to evaluate RNComponentView component bundle '${filePath}'`, error);
    });
    evaluations.set(filePath, evaluation);
  }
  return evaluation;
}

function useEvaluatedComponentBundle(
  runtime: BundleRuntime | undefined,
  { bundleFilePath: filePath, componentName }: RNComponentSessionState
): ComponentBundleStatus {
  const [status, setStatus] = useState<ComponentBundleStatus>(filePath == null ? 'evaluated' : 'evaluating');

  useEffect(() => {
    if (filePath == null) {
      setStatus('evaluated');
      return;
    }
    if (runtime == null) {
      console.error(
        `RNComponentView component '${componentName}' names the bundle '${filePath}', but RNComponentViewRenderer has no runtime to evaluate it`
      );
      setStatus('failed');
      return;
    }
    let isCancelled = false;
    setStatus('evaluating');
    evaluateComponentBundleOnce(runtime, filePath).then(
      () => {
        if (!isCancelled) {
          setStatus('evaluated');
        }
      },
      () => {
        if (!isCancelled) {
          setStatus('failed');
        }
      }
    );
    return () => {
      isCancelled = true;
    };
  }, [runtime, filePath, componentName]);

  return status;
}

interface MeasuredContentProps {
  readonly client: RendererClient;
  readonly sessionId: string;
  readonly sizing: RNComponentViewSizing;
  readonly children: ReactNode;
}

/**
 * The Portal lays content out in the host's bounds but does not report the content's size, so each sizing measures
 * content in a frame the host bounds do not constrain and reports it to the native view.
 */
function MeasuredContent({ client, sessionId, sizing, children }: MeasuredContentProps) {
  const { width: windowWidth } = useWindowDimensions();
  const lastReportedSize = useRef<RNComponentContentSize | null>(null);

  const reportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      const lastSize = lastReportedSize.current;
      // Sub-point changes come from rounding and would only make the native layout oscillate.
      if (lastSize != null && Math.abs(lastSize.width - width) < 0.5 && Math.abs(lastSize.height - height) < 0.5) {
        return;
      }
      lastReportedSize.current = { width, height };
      client.reportContentSize(sessionId, { width, height });
    },
    [client, sessionId]
  );

  switch (sizing) {
    case 'contentHeight':
      return (
        <View collapsable={false} style={styles.contentHeight} onLayout={reportLayout}>
          {children}
        </View>
      );
    case 'contentSize':
      // The content may grow up to the window width.
      return (
        <View pointerEvents="box-none" style={[styles.contentSizeFrame, { width: windowWidth }]}>
          <View collapsable={false} style={styles.contentSize} onLayout={reportLayout}>
            {children}
          </View>
        </View>
      );
    case 'constrained':
      return (
        <View collapsable={false} style={StyleSheet.absoluteFill}>
          {children}
        </View>
      );
    default: {
      const exhaustiveSizing: never = sizing;
      return exhaustiveSizing;
    }
  }
}

interface ComponentErrorBoundaryProps {
  readonly componentName: string;
  readonly children: ReactNode;
}

/** Keeps a failing component from unmounting the other sessions and the host tree. */
class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, { readonly hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Failed to render RNComponentView component '${this.props.componentName}'`, error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

const styles = StyleSheet.create({
  portal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  contentHeight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  contentSizeFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  contentSize: {
    alignSelf: 'flex-start',
  },
});
