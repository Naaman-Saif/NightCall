export class KeyedQueue {
  private readonly tails = new Map<string, Promise<unknown>>();

  run<Result>(key: string, work: () => Result | Promise<Result>): Promise<Result> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(work);
    this.tails.set(key, next);
    const forget = () => {
      if (this.tails.get(key) === next) this.tails.delete(key);
    };
    next.then(forget, forget);
    return next;
  }
}
