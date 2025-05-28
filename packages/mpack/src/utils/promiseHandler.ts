import { noop } from 'es-toolkit';

export class PromiseHandler<T> {
  private _isDone = false;
  private task: Promise<T>;
  private resolver: (data: T) => void = noop;
  private rejector: (error?: Error) => void = noop;

  constructor(public revisionId: number) {
    this.task = new Promise<T>((resolve, reject) => {
      this.resolver = resolve;
      this.rejector = reject;
    });
  }

  get isDone() {
    return this._isDone;
  }

  wait() {
    return this.task;
  }

  done(result: T) {
    this._isDone = true;
    this.resolver(result);
  }

  abort(reason?: Error) {
    this.rejector(reason);
  }
}
