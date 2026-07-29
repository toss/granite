import { BrickModule, type BrickModuleSpec } from 'brick-module';
import { parseServiceSessionEvent } from './serviceSession';
import type { ServiceSessionHost, ServiceSessionNativeSubscription } from './serviceSessionHost';

interface ServiceBundleLoaderModule extends BrickModuleSpec {
  readonly moduleName: string;
  readonly importService: (bundleRequest: string) => Promise<unknown>;
  readonly closeServiceActivity: (identifier: string) => Promise<unknown>;
  readonly startServiceSessionEvents: () => Promise<unknown>;
  readonly onSendEvent: (listener: (event: unknown) => void) => ServiceSessionNativeSubscription;
}

export interface BrickServiceSessionHostOptions {
  readonly bundleLoaderModuleName: string;
  readonly eventModuleName: string;
}

export function createBrickServiceSessionHost({
  bundleLoaderModuleName,
  eventModuleName,
}: BrickServiceSessionHostOptions): ServiceSessionHost | null {
  if (eventModuleName.length === 0) {
    return null;
  }

  const bundleLoaderModule =
    bundleLoaderModuleName.length === 0 ? null : BrickModule.get<ServiceBundleLoaderModule>(bundleLoaderModuleName);
  const eventModule = BrickModule.get<ServiceBundleLoaderModule>(eventModuleName);

  return {
    importService: async (bundleRequest) => {
      if (bundleLoaderModule == null) {
        throw new Error('The platform did not install a service bundle loader.');
      }
      await bundleLoaderModule.importService(bundleRequest);
    },
    closeServiceActivity: async (identifier) => {
      if (bundleLoaderModule == null) {
        throw new Error('The platform did not install a service bundle loader.');
      }
      await bundleLoaderModule.closeServiceActivity(identifier);
    },
    subscribe: (listener) => {
      const subscription = eventModule.onSendEvent((nativeEvent) => {
        const event = parseServiceSessionEvent(nativeEvent);
        if (event != null) {
          listener(event);
        }
      });
      void eventModule.startServiceSessionEvents();
      return () => subscription.remove();
    },
  };
}
