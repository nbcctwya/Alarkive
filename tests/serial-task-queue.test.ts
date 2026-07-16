import { describe, expect, it } from "vitest";
import { SerialTaskQueue } from "@/lib/serial-task-queue";

describe("SerialTaskQueue", () => {
  it("never lets an older slow write execute after a newer write", async () => {
    const queue = new SerialTaskQueue();
    const writes: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue(async () => {
      await firstGate;
      writes.push("old");
    });
    const second = queue.enqueue(async () => {
      writes.push("new");
    });

    await Promise.resolve();
    expect(writes).toEqual([]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(writes).toEqual(["old", "new"]);
  });

  it("continues after a failed task while exposing the latest failure to waiters", async () => {
    const queue = new SerialTaskQueue();
    const failed = queue.enqueue(async () => {
      throw new Error("disk full");
    });
    await expect(failed).rejects.toThrow("disk full");
    await expect(queue.wait()).rejects.toThrow("disk full");

    await queue.enqueue(async () => "saved");
    await expect(queue.wait()).resolves.toBeUndefined();
  });
});
