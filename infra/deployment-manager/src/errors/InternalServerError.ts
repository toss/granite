export class InternalServerError<E = unknown> extends Error {
  constructor(message: string, originError: E) {
    super();
    this.name = 'InternalServerError';
    this.message =
      originError instanceof Error ? `${message} (origin: ${originError.name}, ${originError.message})` : message;
  }
}
