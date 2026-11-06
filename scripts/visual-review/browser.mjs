import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

// An ordinary Playwright launch forces focus emulation and makes background tabs appear visible.
// Use our OWN disposable browser's default context, with the documented noDefaults CDP option.
export async function launchReviewBrowser(output) {
  const profile = await mkdtemp(join(output, ".chromium-"));
  const child = spawn(chromium.executablePath(), [
    "--headless=new", "--no-first-run", "--no-default-browser-check", "--use-mock-keychain",
    `--user-data-dir=${profile}`, "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "about:blank",
  ], { stdio: "ignore" });
  const exited = once(child, "exit");
  const birth = execFileSync("ps", ["-p", String(child.pid), "-o", "lstart="], { encoding: "utf8" }).trim();
  let browser;
  let port;
  const close = async () => {
    await browser?.close();
    if (child.exitCode === null && child.signalCode === null) {
      const currentBirth = execFileSync("ps", ["-p", String(child.pid), "-o", "lstart="], { encoding: "utf8" }).trim();
      if (currentBirth !== birth) throw new Error("Refusing to signal a recycled browser PID");
      child.kill("SIGTERM");
      await Promise.race([exited, delay(5000).then(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      })]);
      await exited;
    }
    await rm(profile, { recursive: true, force: true });
  };
  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`Chromium exited: ${child.exitCode}`);
      try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
      catch { await delay(100); }
    }
    if (!port) throw new Error("Chromium did not expose a loopback CDP port");
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true });
    return { browser, context: browser.contexts()[0], close, ownership: { pid: child.pid, birth, profile, port } };
  } catch (error) {
    await close();
    throw error;
  }
}
