import { vi } from 'vitest';

type HardwareBackPressHandler = () => boolean | null | undefined;

const hardwareBackPressHandlers = new Set<HardwareBackPressHandler>();

export const __backHandlerMock = {
  handlers: hardwareBackPressHandlers,
  addEventListener: vi.fn((_eventName: string, handler: HardwareBackPressHandler) => {
    hardwareBackPressHandlers.add(handler);

    return {
      remove: () => {
        hardwareBackPressHandlers.delete(handler);
      },
    };
  }),
  reset: () => {
    hardwareBackPressHandlers.clear();
    __backHandlerMock.addEventListener.mockClear();
  },
};

export const BackHandler = {
  addEventListener: __backHandlerMock.addEventListener,
  exitApp: vi.fn(),
};

export const TurboModuleRegistry = {
  get: vi.fn(() => null),
  getEnforcing: vi.fn(() => ({
    getConstants: vi.fn(() => ({})),
  })),
};

export const Platform = {
  OS: 'ios',
  select: <T,>(options: { ios?: T; android?: T; default?: T }) => options.ios ?? options.default,
};
