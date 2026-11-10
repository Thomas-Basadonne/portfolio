import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../worker/index.mjs";

afterEach(() => vi.restoreAllMocks());

const assets = () => ({ fetch: vi.fn(async () => new Response("asset", { status: 404 })) });
const env = (allowed = true) => ({
  ASSETS: assets(),
  CLIENT_ERROR_LIMITER: { limit: vi.fn(async () => ({ success: allowed })) },
});
const post = (body, ip = "203.0.113.7") =>
  new Request("https://portfolio.test/api/client-error", {
    method: "POST",
    body,
    headers: { "cf-connecting-ip": ip },
  });

describe("cloudflare worker", () => {
  it("records a valid report, rate limited per IP", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const bindings = env();
    const response = await worker.fetch(post(JSON.stringify({ kind: "runtime", message: "x" })), bindings);

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(bindings.CLIENT_ERROR_LIMITER.limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
    expect(bindings.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("rejects malformed payloads and over-limit callers", async () => {
    expect((await worker.fetch(post("{"), env())).status).toBe(400);
    const limited = env(false);
    expect((await worker.fetch(post("{}"), limited)).status).toBe(429);
  });

  it("binds the limiter at 10 reports per 60 s", async () => {
    const config = await readFile("wrangler.jsonc", "utf8");
    expect(config).toMatch(/"name":\s*"CLIENT_ERROR_LIMITER"/);
    expect(config).toMatch(/"simple":\s*\{\s*"limit":\s*10,\s*"period":\s*60\s*\}/);
  });

  it("hands non-POST and other /api paths back to the static assets (404 page)", async () => {
    const bindings = env();
    await worker.fetch(new Request("https://portfolio.test/api/client-error"), bindings);
    await worker.fetch(new Request("https://portfolio.test/api/other", { method: "POST" }), bindings);
    expect(bindings.ASSETS.fetch).toHaveBeenCalledTimes(2);
    expect(bindings.CLIENT_ERROR_LIMITER.limit).not.toHaveBeenCalled();
  });
});
