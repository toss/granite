export class NotFoundError extends Error {
  constructor(message: string) {
    super();
    this.name = 'NotFoundError';
    this.message = message;
  }
}
