import { test, type Page } from "@playwright/test";
import { isSoftwareRenderer } from "../../src/lib/gatePolicy";

/**
 * The visual-layer tests need a browser profile that exposes WebGL (headless Firefox on CI does not): the app then
 * takes its fallback path, which has its own tests. Same probe as `supportsWebGL()`; a profile WITH WebGL whose
 * visual layer still fails is not skipped and fails the test.
 */
export async function requireWebGL(page: Page) {
  const available = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  });
  test.skip(!available, "This browser profile exposes no WebGL; the fallback path is covered separately.");
}

/**
 * Whether this profile gets the live gate (#17): accelerated WebGL on a hardware renderer, same probe as
 * `webglRenderer(true)` and same rule as `gateMode()`. Headless Chromium renders with SwiftShader (locally and on
 * CI): it gets the poster.
 */
export async function expectsLiveGate(page: Page) {
  const renderer = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const attributes = { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext("webgl2", attributes) || canvas.getContext("webgl", attributes);
    if (!gl) return null;
    let name = String(gl.getParameter(gl.RENDERER) ?? "");
    if (/^webkit webgl$/i.test(name)) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    }
    return name;
  });
  return renderer !== null && !isSoftwareRenderer(renderer);
}
