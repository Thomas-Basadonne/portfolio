import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SPEC } from "../src/experience/tb001/pose";

const sources = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

/** `smoothstep(edge0, edge1, x)` with two numeric literal edges. Reversed edges are undefined in GLSL. */
const LITERAL_RANGE = /smoothstep\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,/g;

describe("shader ranges", () => {
  it("every literal smoothstep range in the scene shaders is ordered", () => {
    const checked: string[] = [];
    for (const file of sources("src/experience")) {
      for (const [call, from, to] of readFileSync(file, "utf8").matchAll(LITERAL_RANGE)) {
        checked.push(`${file}: ${call}`);
        expect(Number(from), `${file}: ${call}`).toBeLessThan(Number(to));
      }
    }
    expect(checked.length).toBeGreaterThan(0);
  });

  it("the seam shader's uniform-driven range stays positive", () => {
    expect(SPEC.shell.gap * 1.6).toBeGreaterThan(0);
    expect(readFileSync("src/experience/tb001/machine.ts", "utf8")).toMatch(/uGap: \{ value: SPEC\.shell\.gap \* 1\.6 \}/);
  });
});
