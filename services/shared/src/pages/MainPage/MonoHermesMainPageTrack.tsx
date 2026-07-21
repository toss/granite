import type { InitialProps } from '@granite-js/react-native';
import { useMemo } from 'react';
import { ErrorPage } from '../../components/ErrorPage';
import { ServiceSessionRouter } from '../../session/ServiceSessionRouter';
import { createBrickServiceSessionHost } from '../../session/brickServiceSessionHost';
import { getServiceSessionHost } from '../../session/serviceSessionHost';
import { createServiceSessionRuntime } from '../../session/serviceSessionRuntime';

type MonoHermesInitialProps = InitialProps & {
  readonly _serviceSessionBundleLoaderModuleName?: string;
  readonly _serviceSessionEventModuleName?: string;
};

export function MonoHermesMainPageTrack({ initialProps }: { readonly initialProps: MonoHermesInitialProps }) {
  const bundleLoaderModuleName = initialProps._serviceSessionBundleLoaderModuleName ?? '';
  const eventModuleName = initialProps._serviceSessionEventModuleName ?? '';
  const host = useMemo(
    () =>
      getServiceSessionHost() ??
      createBrickServiceSessionHost({
        bundleLoaderModuleName,
        eventModuleName,
      }),
    [bundleLoaderModuleName, eventModuleName]
  );
  const runtime = useMemo(() => (host == null ? null : createServiceSessionRuntime(host)), [host]);

  if (runtime == null) {
    return <ErrorPage reason="The platform did not install a service-session bundle loader." />;
  }

  return <ServiceSessionRouter initialProps={initialProps} runtime={runtime} />;
}
