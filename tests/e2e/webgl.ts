import { test, type Page } from "@playwright/test";

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
