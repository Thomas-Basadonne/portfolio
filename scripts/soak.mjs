import { chromium } from "@playwright/test";

const durationMs = 10 * 60 * 1_000;
const intervalMs = 5_000;
const url = process.env.SOAK_URL || "http://127.0.0.1:4173/";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ reducedMotion: "no-preference" });
const page = await context.newPage();
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
await page.goto(url, { waitUntil: "networkidle" });
await page.locator(".webgl-shell canvas").waitFor({ state: "visible" });

const cdp = await context.newCDPSession(page);
await cdp.send("HeapProfiler.enable");
await cdp.send("HeapProfiler.collectGarbage");
const initialHeap = (await cdp.send("Runtime.getHeapUsage")).usedSize;
const initialNodes = await page.locator("*").count();
const samples = [];
const startedAt = Date.now();

for (let index = 0; Date.now() - startedAt < durationMs; index += 1) {
  const phase = (index % 40) / 39;
  const progress = index % 80 < 40 ? phase : 1 - phase;
  await page.evaluate((nextProgress) => {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, maximum * nextProgress);
  }, progress);

  if (index > 0 && index % 24 === 0) {
    await page.locator("#cases").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Tolerance \/ 0\.01/ }).click();
    await page.getByRole("button", { name: /Close/ }).click();
  }

  await page.waitForTimeout(intervalMs);
  if (index % 12 === 0) {
    const heap = (await cdp.send("Runtime.getHeapUsage")).usedSize;
    samples.push({ elapsedSeconds: Math.round((Date.now() - startedAt) / 1_000), heap });
  }
}

await cdp.send("HeapProfiler.collectGarbage");
const finalHeap = (await cdp.send("Runtime.getHeapUsage")).usedSize;
const finalNodes = await page.locator("*").count();
await browser.close();

const permittedHeap = Math.max(initialHeap * 1.5, initialHeap + 25 * 1024 * 1024);
if (finalHeap > permittedHeap) {
  throw new Error(`Heap grew beyond the soak budget: ${initialHeap} -> ${finalHeap} bytes.`);
}
if (finalNodes > initialNodes * 1.1 + 20) {
  throw new Error(`DOM node count grew beyond the soak budget: ${initialNodes} -> ${finalNodes}.`);
}
if (errors.length) throw new Error(`Unexpected runtime errors: ${errors.join(" | ")}`);

console.log(
  JSON.stringify(
    { durationSeconds: Math.round((Date.now() - startedAt) / 1_000), initialHeap, finalHeap, initialNodes, finalNodes, samples },
    null,
    2,
  ),
);
