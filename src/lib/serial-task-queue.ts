export class SerialTaskQueue {
  private tail: Promise<void> = Promise.resolve();
  private latest: Promise<void> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.catch(() => undefined).then(task);
    this.latest = result.then(() => undefined);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async wait(): Promise<void> {
    await this.latest;
  }
}
