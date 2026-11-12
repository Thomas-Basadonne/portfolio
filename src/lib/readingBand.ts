/**
 * Reading band of the portrait staged layout (#49, direction A «strumento in tasca»).
 *
 * The stage band keeps its full layout height, so the text never moves when the band changes. While the reader is
 * in a reading chapter the band is only visually narrowed (a clip from the bottom, the canvas keeps its size) and the
 * model is framed in the part that stays visible. Open means full band, closed means reading band.
 */

export type BandGap = { top: number; bottom: number };

export type BandTarget = {
  /** Chapter index of the story position (0 hero … 5 contact). */
  chapter: number;
  /** Portrait staged layout: the band can narrow. Elsewhere it stays full. */
  narrowable: boolean;
  /** Viewport y where the reading band ends (its visible bottom). */
  zoneTop: number;
  /** Viewport y where the full band ends. */
  zoneBottom: number;
  /** Empty bands between two chapters' text, in viewport coordinates. */
  gaps: readonly BandGap[];
  /** Viewport y of the first contact link (Infinity when absent): the finale band ends above it. */
  contactTop: number;
};

/**
 * 1 = full band, 0 = reading band, in between = a measured stop (the finale). The band is full in the hero, and in
 * every change of chapter: the empty band between two chapters has to sit under the widened part, so the model never
 * crosses a paragraph. The gap before a chapter's heading counts too, so Work is full only in the empty space before
 * its heading and narrows before any part of its intro reaches the full band. The finale keeps the full band while
 * the first contact link clears it, and otherwise ends the band just above that link, never above the reading band.
 */
export function bandOpenTarget(input: BandTarget): number {
  if (!input.narrowable || input.chapter <= 0) return 1;
  if (input.chapter >= 5) return finaleOpen(input);
  return input.gaps.some((gap) => gap.top <= input.zoneTop && gap.bottom >= input.zoneBottom) ? 1 : 0;
}

function finaleOpen({ zoneTop, zoneBottom, contactTop }: Pick<BandTarget, "zoneTop" | "zoneBottom" | "contactTop">) {
  const span = zoneBottom - zoneTop;
  if (span <= 0) return 1;
  const visibleBottom = Math.min(zoneBottom, Math.max(zoneTop, contactTop));
  return 1 - (zoneBottom - visibleBottom) / span;
}

/** Pixels hidden at the bottom of the band for an open state (0 = full, the reading gap when closed). */
export function bandCutPx({ open, full, reading }: { open: number; full: number; reading: number }): number {
  return (1 - open) * Math.max(0, full - Math.min(full, reading));
}
