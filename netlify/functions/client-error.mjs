import { handleClientError } from "../../server/client-error.mjs";

export default handleClientError;

export const config = {
  // Literal on purpose: Netlify reads this config statically and ignores imported identifiers.
  path: "/api/client-error",
  method: "POST",
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};
