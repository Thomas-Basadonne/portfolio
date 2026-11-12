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
  /** Empty bands between two chapters' text, in document coordinates. */
  gaps: readonly BandGap[];
  /** Document y of the contact block's first line (its kicker or title; Infinity when absent). */
  contactTop: number;
  /** Document scroll offset: `gaps` and `contactTop` are read in document coordinates (default 0). */
  scroll?: number;
};

/**
 * 1 = full band, 0 = reading band, in between = a measured stop (the finale). The band is full in the hero, and in
 * every change of chapter: the empty band between two chapters has to sit under the widened part, so the model never
 * crosses a paragraph. A gap counts for any chapter it is in, so Work is full in the empty space before its heading
 * and in the empty space after it (both clear of its text). The finale stops the band at the top of its contact
 * block, never above the reading band: it keeps the full band only while the whole block clears it.
 */
export function bandOpenTarget(input: BandTarget): number {
  if (!input.narrowable || input.chapter <= 0) return 1;
  const scroll = input.scroll ?? 0;
  if (input.chapter >= 5) return finaleOpen(input.zoneTop, input.zoneBottom, input.contactTop - scroll);
  return input.gaps.some((gap) => gap.top - scroll <= input.zoneTop && gap.bottom - scroll >= input.zoneBottom) ? 1 : 0;
}

function finaleOpen(zoneTop: number, zoneBottom: number, blockTop: number) {
  const span = zoneBottom - zoneTop;
  if (span <= 0) return 1;
  const visibleBottom = Math.min(zoneBottom, Math.max(zoneTop, blockTop));
  return 1 - (zoneBottom - visibleBottom) / span;
}

/** Pixels hidden at the bottom of the band for an open state (0 = full, the reading gap when closed). */
export function bandCutPx({ open, full, reading }: { open: number; full: number; reading: number }): number {
  return (1 - open) * Math.max(0, full - Math.min(full, reading));
}
