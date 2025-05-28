export class InvalidRequest extends Error {
  constructor(message: string) {
    super();
    this.name = 'InvalidRequest';
    this.message = message;
  }
}
