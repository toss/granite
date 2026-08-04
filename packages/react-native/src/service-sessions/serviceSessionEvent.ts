import { z } from 'zod';

const nativeServiceSessionEventSchema = z.discriminatedUnion('eventName', [
  z.object({
    eventName: z.literal('openService'),
    body: z.object({
      identifier: z.string().min(1),
      serviceName: z.string().min(1),
      url: z.string().min(1),
    }),
  }),
  z.object({
    eventName: z.literal('closeService'),
    body: z.object({
      identifier: z.string().min(1),
    }),
  }),
  z.object({
    eventName: z.literal('sessionVisibilityChanged'),
    body: z.object({
      identifier: z.string().min(1),
      isVisible: z.boolean(),
    }),
  }),
]);

export type ServiceSessionEvent = z.infer<typeof nativeServiceSessionEventSchema>;

export type ServiceSessionEventMap = {
  readonly openService: Readonly<Extract<ServiceSessionEvent, { readonly eventName: 'openService' }>['body']>;
  readonly closeService: Readonly<Extract<ServiceSessionEvent, { readonly eventName: 'closeService' }>['body']>;
  readonly sessionVisibilityChanged: Readonly<
    Extract<ServiceSessionEvent, { readonly eventName: 'sessionVisibilityChanged' }>['body']
  >;
};

export function parseServiceSessionEvent(value: unknown): ServiceSessionEvent | null {
  const result = nativeServiceSessionEventSchema.safeParse(value);
  return result.success ? result.data : null;
}
