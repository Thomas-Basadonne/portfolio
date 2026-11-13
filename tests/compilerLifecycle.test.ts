import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Group, PerspectiveCamera, Scene } from "three";

// Exercise the real committed build and cleanup callbacks without requiring a GPU or a DOM renderer.
const hooks = vi.hoisted(() => ({
  effects: [] as (() => void | (() => void))[],
  frame: (() => {}) as (state: unknown, delta: number) => void,
  three: {} as Record<string, unknown>,
}));
vi.mock("react", () => ({
  useCallback: (callback: () => void) => callback,
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
  useMemo: (create: () => unknown) => create(),
  useRef: (current: unknown) => ({ current }),
}));
vi.mock("@react-three/fiber", () => ({
  useThree: () => hooks.three,
  useFrame: (frame: typeof hooks.frame) => { hooks.frame = frame; },
}));
vi.mock("../src/experience/tb001/studio", () => ({ createStudioEnvironment: vi.fn() }));
vi.mock("../src/experience/tb001/textures", () => ({ createMachineTextures: vi.fn() }));
vi.mock("../src/experience/tb001/machine", () => ({ createMachine: vi.fn() }));

import { TB001Model } from "../src/experience/CompilerMachine";
import { createStudioEnvironment } from "../src/experience/tb001/studio";
import { createMachineTextures } from "../src/experience/tb001/textures";
import { createMachine } from "../src/experience/tb001/machine";

beforeEach(() => {
  vi.useFakeTimers();
  hooks.effects = [];
  hooks.three = { gl: { compile: vi.fn() }, scene: new Scene(), camera: new PerspectiveCamera(), invalidate: vi.fn() };
  vi.stubGlobal("window", {
    setTimeout,
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 16),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

function resources() {
  const environment = { texture: {}, dispose: vi.fn() };
  const textures = { wear: { dispose: vi.fn() }, panelBump: null, panels: null, oblo: null };
  const machine = { root: new Group(), update: vi.fn(), dispose: vi.fn() };
  vi.mocked(createStudioEnvironment).mockReturnValue(environment as unknown as ReturnType<typeof createStudioEnvironment>);
  vi.mocked(createMachineTextures).mockReturnValue(textures as unknown as ReturnType<typeof createMachineTextures>);
  vi.mocked(createMachine).mockReturnValue(machine as unknown as ReturnType<typeof createMachine>);
  return { environment, textures, machine };
}

function mount(onBuilt = vi.fn(), onFailure = vi.fn()) {
  TB001Model({ quality: "low", drive: () => {}, onBuilt, onFailure });
  const cleanups = hooks.effects.map((effect) => effect());
  return () => cleanups.forEach((cleanup) => cleanup?.());
}

describe("Compiler committed build lifecycle", () => {
  it("releases a committed model when shader compilation fails", async () => {
    const { machine, environment } = resources();
    const error = new Error("shader compile failed");
    hooks.three.gl = { compile: () => { throw error; } };
    const onFailure = vi.fn();
    const unmount = mount(vi.fn(), onFailure);
    await vi.runAllTimersAsync();
    expect(onFailure).toHaveBeenCalledWith(error);
    expect(machine.dispose).toHaveBeenCalledTimes(1);
    expect(environment.dispose).toHaveBeenCalledTimes(1);
    unmount();
    expect(machine.dispose).toHaveBeenCalledTimes(1);
    expect(environment.dispose).toHaveBeenCalledTimes(1);
  });

  it("cancels first-frame readiness when the model unmounts before the next paint", async () => {
    const { machine, environment } = resources();
    const onBuilt = vi.fn();
    const unmount = mount(onBuilt);
    await vi.runAllTimersAsync();
    hooks.frame(undefined, 0.016);
    unmount();
    await vi.runAllTimersAsync();
    expect(onBuilt).not.toHaveBeenCalled();
    expect(machine.dispose).toHaveBeenCalledTimes(1);
    expect(environment.dispose).toHaveBeenCalledTimes(1);
  });

  it("disposes a failed partial build immediately and does not dispose it again on unmount", async () => {
    const { environment, textures } = resources();
    const error = new Error("geometry allocation failed");
    vi.mocked(createMachine).mockImplementation(() => { throw error; });
    const onFailure = vi.fn();
    const unmount = mount(vi.fn(), onFailure);
    await vi.runAllTimersAsync();
    expect(onFailure).toHaveBeenCalledWith(error);
    expect(environment.dispose).toHaveBeenCalledTimes(1);
    expect(textures.wear.dispose).toHaveBeenCalledTimes(1);
    unmount();
    expect(environment.dispose).toHaveBeenCalledTimes(1);
    expect(textures.wear.dispose).toHaveBeenCalledTimes(1);
  });
});
