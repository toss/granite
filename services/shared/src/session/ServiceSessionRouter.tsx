import type { InitialProps } from '@granite-js/react-native';
import { useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import { ServiceSessionRenderer } from './ServiceSessionRenderer';
import { type ServiceSession, reduceServiceSessions } from './serviceSession';
import type { ServiceSessionRuntime } from './serviceSessionRuntime';

const INITIAL_SESSIONS: readonly ServiceSession[] = [];

export interface ServiceSessionRouterProps {
  readonly initialProps: InitialProps;
  readonly runtime: ServiceSessionRuntime;
}

export function ServiceSessionRouter({ initialProps, runtime }: ServiceSessionRouterProps) {
  const [sessions, dispatch] = useReducer(reduceServiceSessions, INITIAL_SESSIONS);

  useEffect(() => runtime.subscribe(dispatch), [runtime]);

  return (
    <View style={styles.container}>
      {sessions.map((session) => (
        <ServiceSessionRenderer
          key={session.identifier}
          initialProps={initialProps}
          runtime={runtime}
          session={session}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
