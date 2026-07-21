export interface TrackedGlobalRecord {
  readonly name: string;
  readonly read: () => Readonly<Record<string, unknown>>;
}

export interface TrackedGlobalRecordReport {
  readonly name: string;
  readonly addedKeys: readonly string[];
  readonly overwrittenKeys: readonly string[];
}

export interface ServiceGlobalReport {
  readonly serviceKey: string;
  readonly addedGlobalKeys: readonly string[];
  readonly restoredProtectedKeys: readonly string[];
  readonly trackedRecords: readonly TrackedGlobalRecordReport[];
}

export interface ServiceGlobalGuardOptions {
  readonly protectedKeys?: readonly string[];
  readonly trackedRecords?: readonly TrackedGlobalRecord[];
  readonly onReport?: (report: ServiceGlobalReport) => void;
}

export interface ServiceGlobalGuard {
  run<T>(serviceKey: string, task: () => Promise<T>): Promise<T>;
  getReport(serviceKey: string): ServiceGlobalReport | undefined;
}

interface ServiceGlobalSnapshot {
  readonly globalKeys: ReadonlySet<string>;
  readonly protectedDescriptors: ReadonlyMap<string, PropertyDescriptor | undefined>;
  readonly trackedRecords: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
}

class DefaultServiceGlobalGuard implements ServiceGlobalGuard {
  private readonly reports = new Map<string, ServiceGlobalReport>();

  constructor(private readonly options: ServiceGlobalGuardOptions) {}

  async run<T>(serviceKey: string, task: () => Promise<T>): Promise<T> {
    const snapshot = this.capture();
    try {
      return await task();
    } finally {
      const report = this.reconcile(serviceKey, snapshot);
      this.reports.set(serviceKey, report);
      this.options.onReport?.(report);
    }
  }

  getReport(serviceKey: string): ServiceGlobalReport | undefined {
    return this.reports.get(serviceKey);
  }

  private capture(): ServiceGlobalSnapshot {
    const protectedDescriptors = new Map<string, PropertyDescriptor | undefined>();
    for (const key of this.options.protectedKeys ?? []) {
      protectedDescriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    }

    const trackedRecords = new Map<string, Readonly<Record<string, unknown>>>();
    for (const trackedRecord of this.options.trackedRecords ?? []) {
      trackedRecords.set(trackedRecord.name, { ...trackedRecord.read() });
    }

    return {
      globalKeys: new Set(Object.getOwnPropertyNames(globalThis)),
      protectedDescriptors,
      trackedRecords,
    };
  }

  private reconcile(serviceKey: string, snapshot: ServiceGlobalSnapshot): ServiceGlobalReport {
    const restoredProtectedKeys: string[] = [];
    for (const [key, descriptor] of snapshot.protectedDescriptors) {
      const currentDescriptor = Object.getOwnPropertyDescriptor(globalThis, key);
      if (descriptorsEqual(currentDescriptor, descriptor)) {
        continue;
      }

      restoredProtectedKeys.push(key);
      if (descriptor == null) {
        Reflect.deleteProperty(globalThis, key);
      } else {
        Object.defineProperty(globalThis, key, descriptor);
      }
    }

    const trackedRecords = (this.options.trackedRecords ?? []).map((trackedRecord) => {
      const before = snapshot.trackedRecords.get(trackedRecord.name) ?? {};
      const after = trackedRecord.read();
      const addedKeys: string[] = [];
      const overwrittenKeys: string[] = [];

      for (const key of Object.keys(after)) {
        if (!(key in before)) {
          addedKeys.push(key);
        } else if (!Object.is(after[key], before[key])) {
          overwrittenKeys.push(key);
        }
      }

      return { name: trackedRecord.name, addedKeys, overwrittenKeys };
    });

    return {
      serviceKey,
      addedGlobalKeys: Object.getOwnPropertyNames(globalThis).filter((key) => !snapshot.globalKeys.has(key)),
      restoredProtectedKeys,
      trackedRecords,
    };
  }
}

function descriptorsEqual(left: PropertyDescriptor | undefined, right: PropertyDescriptor | undefined): boolean {
  if (left == null || right == null) {
    return left === right;
  }

  return (
    left.configurable === right.configurable &&
    left.enumerable === right.enumerable &&
    left.get === right.get &&
    left.set === right.set &&
    left.value === right.value &&
    left.writable === right.writable
  );
}

export function createServiceGlobalGuard(options: ServiceGlobalGuardOptions = {}): ServiceGlobalGuard {
  return new DefaultServiceGlobalGuard(options);
}
