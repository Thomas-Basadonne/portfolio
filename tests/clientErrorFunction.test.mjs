import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { config } from "../netlify/functions/client-error.mjs";

afterEach(() => vi.restoreAllMocks());

describe("client error function", () => {
  it("accepts a sanitized technical error and exposes a bounded route", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handler(
      new Request("https://example.test/api/client-error", {
        method: "POST",
        body: JSON.stringify({
          kind: "runtime",
          name: "Error",
          message: "Failure for private@example.test at https://example.test/path?secret=value",
          path: "/portfolio?private=value",
          release: "test",
        }),
      }),
    );

    expect(response.status).toBe(204);
    expect(config.method).toBe("POST");
    expect(config.rateLimit.windowLimit).toBe(10);
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0][0]).toContain("[redacted-email]");
    expect(log.mock.calls[0][0]).not.toContain("secret=value");
    expect(log.mock.calls[0][0]).not.toContain("private=value");
  });

  it("rejects malformed payloads", async () => {
    const response = await handler(
      new Request("https://example.test/api/client-error", { method: "POST", body: "{" }),
    );
    expect(response.status).toBe(400);
  });
});
