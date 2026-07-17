export type ExperiencePhase = "entry" | "loading" | "ready" | "failed";

export type ExperienceAction =
  | { type: "ENTER" }
  | { type: "CANVAS_READY" }
  | { type: "CANVAS_FAILED" };

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

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
