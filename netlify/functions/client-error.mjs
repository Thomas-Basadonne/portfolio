import { CLIENT_ERROR_PATH, handleClientError } from "../../server/client-error.mjs";

export default handleClientError;

export const config = {
  path: CLIENT_ERROR_PATH,
  method: "POST",
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};
