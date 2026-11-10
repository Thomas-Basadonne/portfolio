import { afterEach, describe, expect, it, vi } from "vitest";
import { handleClientError } from "../server/client-error.mjs";

afterEach(() => vi.restoreAllMocks());

describe("client error handler", () => {
  it("accepts a sanitized technical error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handleClientError(
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
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0][0]).toContain("[redacted-email]");
    expect(log.mock.calls[0][0]).not.toContain("secret=value");
    expect(log.mock.calls[0][0]).not.toContain("private=value");
  });

  it("rejects malformed payloads", async () => {
    const response = await handleClientError(
      new Request("https://example.test/api/client-error", { method: "POST", body: "{" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects JSON that is not an object", async () => {
    for (const body of ["null", "42", '"text"']) {
      const response = await handleClientError(
        new Request("https://example.test/api/client-error", { method: "POST", body }),
      );
      expect(response.status).toBe(400);
    }
  });
});
