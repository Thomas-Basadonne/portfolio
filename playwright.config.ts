import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORTFOLIO_TEST_PORT ?? 4173);
// Set to test an already running host (e.g. `wrangler dev` or a workers.dev preview) instead of
// `vite preview`, which serves neither the CSP nor the API route.
const externalURL = process.env.PORTFOLIO_TEST_BASE_URL || undefined;
const baseURL = externalURL ?? `http://127.0.0.1:${port}`;
// CI sets the worker count per job; the value is chosen from measured runs, not guessed.
const ciWorkers = Number(process.env.PLAYWRIGHT_WORKERS ?? 2);
// A broken pull request stops early instead of running (and retrying) the whole suite.
const isPullRequest = process.env.GITHUB_EVENT_NAME === "pull_request";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // One retry still separates a flake from a failure; a second only repeats deterministic failures.
  retries: process.env.CI ? 1 : 0,
  maxFailures: isPullRequest ? 10 : 0,
  workers: process.env.CI ? ciWorkers : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: externalURL
    ? undefined
    : {
        command: `pnpm preview --host 127.0.0.1 --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 30_000,
      },
});
