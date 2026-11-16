import type { Page } from "@playwright/test";

/*
 * Deterministic layouts for geometry specs, as holdStagedLayout (portfolio.spec.ts). The staged layout is CSS: the
 * scene chunk is answered with a module that never finishes and only the WebGL probe gets a context, so the layout is
 * the same on every engine, Firefox on CI (no WebGL) included. The fallback layout gets no WebGL at all. Must run
 * before navigation.
 */
export async function holdLayout(page: Page, layout: "staged" | "fallback") {
  if (layout === "staged") {
    await page.route(/ExperienceCanvas-.*\.js/, (route) =>
      route.fulfill({ contentType: "text/javascript", body: "await new Promise(() => {});" }));
  }
  await page.addInitScript((staged) => {
    const original = HTMLCanvasElement.prototype.getContext;
    Reflect.set(HTMLCanvasElement.prototype, "getContext", function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (!type.startsWith("webgl")) return Reflect.apply(original, this, [type, ...rest]);
      return staged ? Reflect.apply(original, this, [type, ...rest]) ?? {} : null;
    });
  }, layout === "staged");
}

export async function settleLayout(page: Page, layout: "staged" | "fallback") {
  await page.waitForFunction((staged) => {
    const shell = document.querySelector(".scene-staged");
    return Boolean(shell) && shell!.hasAttribute("data-scene-layout") === staged;
  }, layout === "staged");
  await page.evaluate(() => document.fonts.ready);
}
