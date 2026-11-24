import { expect, test, type Page } from "@playwright/test";
import { portfolioContent } from "../../src/content/portfolio";
import { readFileSync } from "node:fs";

type Flow = { flow: Record<"en" | "it", { step: string; text: string }[]> };
const log = JSON.parse(readFileSync(new URL("../../src/content/method-flow.json", import.meta.url), "utf8")) as Flow;

/*
 * AST-01 (#47): the Method chapter, approved by Thomas on 2026-11-23. Copy and contract are unit-tested
 * (tests/method.test.ts); here: the chapter in the story, its flow loaded outside the entry and the static page
 * without JS.
 */

async function enter(page: Page, locale: "en" | "it", hash = "") {
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  await page.goto(`/?lang=${locale}${hash}`);
  await expect(page.locator(".hud__readout")).toBeVisible();
}

for (const locale of ["en", "it"] as const) {
  const { method, chapters } = portfolioContent[locale];

  test(`the Method chapter sits between Experience and Contact and loads its flow (${locale})`, async ({ page }) => {
    const chunks: string[] = [];
    page.on("request", (request) => { if (/method-flow-.*\.js/.test(request.url())) chunks.push(request.url()); });
    await enter(page, locale, "#method");
    const nav = page.locator(".chapter-nav a");
    await expect(nav).toHaveCount(chapters.length);
    const order = await nav.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(order.slice(-3)).toEqual(["#experience", "#method", "#contact"]);
    const section = page.locator("#method");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText(method.title.lead + method.title.emphasis);
    await expect(section.getByText(method.boundary, { exact: true })).toBeVisible();
    for (const profile of method.profiles) await expect(section.getByRole("heading", { name: profile.name, exact: true })).toBeAttached();
    // The flow: every step, in order, with no link to a specific task.
    await expect(section.getByText(method.flowTitle, { exact: true })).toBeAttached();
    const items = section.locator(".trace-list").last().locator("li");
    await expect(items).toHaveCount(log.flow[locale].length);
    await expect(items.locator("h3")).toHaveText(log.flow[locale].map((step) => step.step));
    await expect(items.locator("a")).toHaveCount(0);
    expect(chunks.length, "the flow arrives as its own chunk").toBe(1);
  });
}

test("without JavaScript the static page carries the Method chapter and its flow", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  // The prerendered root and the <noscript> block carry the same static page: check the first.
  const section = page.locator("#method-static").first();
  await expect(section.getByRole("heading", { level: 2 })).toHaveText(`${portfolioContent.en.method.title.lead}${portfolioContent.en.method.title.emphasis}`);
  await expect(section.getByText(portfolioContent.en.method.boundary)).toBeVisible();
  await expect(section.getByText(/^How a task runs:/)).toBeVisible();
  await expect(section.locator("a")).toHaveCount(0);
  await expect(page.locator('nav a[href="#method-static"]').first()).toBeVisible();
  await context.close();
});
