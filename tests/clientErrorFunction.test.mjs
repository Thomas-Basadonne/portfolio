import { readFile } from "node:fs/promises";
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

  it("rejects JSON that is not an object", async () => {
    for (const body of ["null", "42", '"text"']) {
      const response = await handler(new Request("https://example.test/api/client-error", { method: "POST", body }));
      expect(response.status).toBe(400);
    }
  });

  it("declares the route as a literal Netlify can read statically", async () => {
    // Netlify parses `config` from the source without running it: an imported identifier is not
    // read, and the function silently loses its route.
    const source = await readFile("netlify/functions/client-error.mjs", "utf8");
    expect(source).toMatch(/^\s*path:\s*"\/api\/client-error",\s*$/m);
  });
});
