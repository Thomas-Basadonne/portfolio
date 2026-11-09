import { CLIENT_ERROR_PATH, handleClientError } from "../server/client-error.mjs";

// `_headers` rules do not apply to responses built here, so API responses carry their own baseline.
const apiHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "cross-origin-resource-policy": "same-origin",
};

const withHeaders = (response) => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(apiHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, headers });
};

// Only `/api/*` reaches this code (`run_worker_first` in wrangler.jsonc); everything else is served
// as a static asset with the `_headers` rules. Netlify answers a non-POST on the function route with
// the 404 page, so this Worker hands those requests back to the assets for the same result.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== CLIENT_ERROR_PATH || request.method !== "POST") return env.ASSETS.fetch(request);

    // Same key as Netlify (`aggregateBy: ["ip"]`). The binding is per Cloudflare location and
    // approximate: it bounds abuse of a log endpoint, it is not an exact quota.
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const { success } = await env.CLIENT_ERROR_LIMITER.limit({ key: ip });
    if (!success) return withHeaders(new Response(null, { status: 429 }));

    return withHeaders(await handleClientError(request));
  },
};
