import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    setTimeout, clearTimeout,
    requestAnimationFrame: (callback: (time: number) => void) => setTimeout(() => callback(performance.now()), 16),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    matchMedia: () => ({ matches: false }),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("boot loader lifecycle", () => {
  it("finishes once at the cap and removes the decorative node after its reveal", async () => {
    const root = { style: { setProperty: vi.fn() }, querySelector: () => null,
      classList: { add: vi.fn() }, remove: vi.fn() };
    vi.stubGlobal("document", { getElementById: () => root });
    const { onBootFinished, startBoot, reachBoot } = await import("../src/lib/bootLoader");
    const finished = vi.fn();
    onBootFinished(finished);
    startBoot("interactive");
    reachBoot("fonts");
    await vi.advanceTimersByTimeAsync(4999);
    expect(finished).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(root.remove).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(180);
    expect(root.classList.add).toHaveBeenCalledWith("is-done");
    await vi.advanceTimersByTimeAsync(1120);
    expect(root.remove).toHaveBeenCalledTimes(1);
    reachBoot("scene");
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers at the cap even when the decorative node is absent", async () => {
    vi.stubGlobal("document", { getElementById: () => null });
    const { onBootFinished, startBoot } = await import("../src/lib/bootLoader");
    const finished = vi.fn();
    onBootFinished(finished);
    startBoot("interactive");
    await vi.advanceTimersByTimeAsync(4999);
    expect(finished).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(finished).toHaveBeenCalledTimes(1);
    const lateSubscriber = vi.fn();
    onBootFinished(lateSubscriber);
    expect(lateSubscriber).toHaveBeenCalledTimes(1);
  });
});
