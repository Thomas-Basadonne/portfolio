export type ExperiencePhase = "entry" | "loading" | "ready" | "failed";

export type ExperienceAction =
  | { type: "ENTER" }
  | { type: "CANVAS_READY" }
  | { type: "CANVAS_FAILED" }
  /** Recalibrate (#17): back to the gate from the story. */
  | { type: "EXIT" };

export function experienceReducer(
  phase: ExperiencePhase,
  action: ExperienceAction,
): ExperiencePhase {
  switch (action.type) {
    case "ENTER":
      return phase === "entry" ? "loading" : phase;
    case "CANVAS_READY":
      return phase === "loading" ? "ready" : phase;
    case "CANVAS_FAILED":
      return phase === "entry" ? phase : "failed";
    case "EXIT":
      return "entry";
  }
}

export function getInitialExperiencePhase(): ExperiencePhase {
  if (typeof window === "undefined") return "entry";

  const navigation = window.performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return resolveInitialExperiencePhase({
    hasDeepLink: window.location.hash.length > 1,
    isReload: navigation?.type === "reload",
    wasEntered: window.sessionStorage.getItem("tb:entry-seen") === "1",
  });
}

export function resolveInitialExperiencePhase({
  hasDeepLink,
  isReload,
  wasEntered,
}: {
  hasDeepLink: boolean;
  isReload: boolean;
  wasEntered: boolean;
}): ExperiencePhase {
  return hasDeepLink || isReload || wasEntered ? "loading" : "entry";
}

/**
 * The WebGL renderer's name: null without WebGL, "" when the browser hides it. `accelerated` asks for a context
 * without a major performance caveat: where the browser falls back to a software rasterizer (no GPU, blocklisted GPU)
 * it refuses at once, instead of starting the rasterizer on the main thread (Chrome on SwiftShader: ~0.7–0.9 s for
 * the first context). Chromium masks RENDERER ("WebKit WebGL") and names the GPU in the debug extension; Firefox
 * names it in RENDERER and warns on the extension.
 */
export function webglRenderer(accelerated = false): string | null {
  try {
    const canvas = document.createElement("canvas");
    const attributes: WebGLContextAttributes = { failIfMajorPerformanceCaveat: accelerated };
    const gl = canvas.getContext("webgl2", attributes) || canvas.getContext("webgl", attributes);
    if (!gl) return null;
    // A context whose name cannot be read is still WebGL, of unknown renderer.
    try {
      const name = String(gl.getParameter(gl.RENDERER) ?? "");
      if (!/^webkit webgl$/i.test(name)) return name;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    } catch {
      return "";
    }
  } catch {
    return null;
  }
}

/** Any WebGL, software included: after entry the scene loads on it, as before #17. */
export function supportsWebGL(): boolean {
  return webglRenderer() !== null;
}
