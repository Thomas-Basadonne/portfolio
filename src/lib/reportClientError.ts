type ClientErrorKind = "application" | "visual" | "runtime" | "promise";

type ClientErrorPayload = {
  kind: ClientErrorKind;
  name: string;
  message: string;
  stack?: string;
  path: string;
  release: string;
};

function asError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === "string" ? value : "Unknown client error");
}

export function reportClientError(kind: ClientErrorKind, value: unknown, componentStack?: string) {
  if (!import.meta.env.PROD) return;
  const error = asError(value);
  const payload: ClientErrorPayload = {
    kind,
    name: error.name.slice(0, 80),
    message: error.message.slice(0, 500),
    stack: (componentStack || error.stack)?.slice(0, 2_000),
    path: window.location.pathname,
    release: import.meta.env.VITE_COMMIT_REF || "local-production-build",
  };
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))) {
    return;
  }

  void fetch("/api/client-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
