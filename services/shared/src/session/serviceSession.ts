import { z } from 'zod';

export const SERVICE_SESSION_NATIVE_ID_PREFIX = 'micro-frontend-session:';

export type ServiceSession = {
  readonly identifier: string;
  readonly bundleRequest: string;
  readonly url: string;
  readonly isVisible: boolean;
};

export type ServiceSessionEvent =
  | {
      readonly kind: 'open';
      readonly identifier: string;
      readonly bundleRequest: string;
      readonly url: string;
    }
  | { readonly kind: 'close'; readonly identifier: string }
  | {
      readonly kind: 'visibilityChanged';
      readonly identifier: string;
      readonly isVisible: boolean;
    };

const nativeServiceSessionEventSchema = z.discriminatedUnion('eventName', [
  z.object({
    eventName: z.literal('openService'),
    body: z.object({
      identifier: z.string().min(1),
      bundleRequest: z.string().min(1),
      url: z.string().min(1),
    }),
  }),
  z.object({
    eventName: z.literal('closeService'),
    body: z.object({ identifier: z.string().min(1) }),
  }),
  z.object({
    eventName: z.literal('sessionVisibilityChanged'),
    body: z.object({ identifier: z.string().min(1), isVisible: z.boolean() }),
  }),
]);

export function parseServiceSessionEvent(value: unknown): ServiceSessionEvent | null {
  const result = nativeServiceSessionEventSchema.safeParse(value);
  if (!result.success) {
    return null;
  }

  switch (result.data.eventName) {
    case 'openService':
      return {
        kind: 'open',
        identifier: result.data.body.identifier,
        bundleRequest: result.data.body.bundleRequest,
        url: result.data.body.url,
      };
    case 'closeService':
      return { kind: 'close', identifier: result.data.body.identifier };
    case 'sessionVisibilityChanged':
      return {
        kind: 'visibilityChanged',
        identifier: result.data.body.identifier,
        isVisible: result.data.body.isVisible,
      };
    default: {
      const exhaustiveEvent: never = result.data;
      return exhaustiveEvent;
    }
  }
}

export function reduceServiceSessions(
  sessions: readonly ServiceSession[],
  event: ServiceSessionEvent
): readonly ServiceSession[] {
  switch (event.kind) {
    case 'open':
      return sessions.some((session) => session.identifier === event.identifier)
        ? sessions
        : [
            ...sessions,
            {
              identifier: event.identifier,
              bundleRequest: event.bundleRequest,
              url: event.url,
              isVisible: false,
            },
          ];
    case 'close':
      return sessions.filter((session) => session.identifier !== event.identifier);
    case 'visibilityChanged':
      return sessions.map((session) =>
        session.identifier === event.identifier ? { ...session, isVisible: event.isVisible } : session
      );
    default: {
      const exhaustiveEvent: never = event;
      return exhaustiveEvent;
    }
  }
}
