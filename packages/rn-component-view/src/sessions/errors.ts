export class InvalidNativeComponentEventError extends Error {
  readonly eventName: string;
  readonly fieldName?: string;

  constructor(eventName: string, fieldName?: string) {
    const detail = fieldName == null ? '' : `: missing or invalid '${fieldName}'`;
    super(`Invalid native RNComponentView event '${eventName}'${detail}`);
    this.name = 'InvalidNativeComponentEventError';
    this.eventName = eventName;
    this.fieldName = fieldName;
  }
}
