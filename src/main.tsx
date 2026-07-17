import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { reportClientError } from "./lib/reportClientError";

window.addEventListener("error", (event) => reportClientError("runtime", event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => reportClientError("promise", event.reason));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
