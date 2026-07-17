const scrub = (value, limit) =>
  String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/https?:\/\/[^\s?#]+\?[^\s]*/gi, "[redacted-url]")
    .slice(0, limit);

export default async (request) => {
  const text = (await request.text()).slice(0, 8_000);
  let input;

  try {
    input = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const entry = {
    event: "portfolio-client-error",
    kind: scrub(input.kind, 24),
    name: scrub(input.name, 80),
    message: scrub(input.message, 500),
    stack: scrub(input.stack, 2_000),
    path: scrub(input.path, 160).split("?")[0],
    release: scrub(input.release, 80),
    recordedAt: new Date().toISOString(),
  };

  console.error(JSON.stringify(entry));
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
};

export const config = {
  path: "/api/client-error",
  method: "POST",
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};
