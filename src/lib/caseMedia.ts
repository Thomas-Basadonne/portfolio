import type { CaseMedia } from "../content/portfolio";

/**
 * Drawer column: min(55rem, 74vw) with padding, so ~52rem at most; full width on narrow screens.
 * Tiles sit two per row from 761px up, so each gets roughly half of that column.
 */
export const caseMediaSizes = {
  hero: "(min-width: 761px) 52rem, 100vw",
  tile: "(min-width: 761px) 25rem, 100vw",
} as const;

/** `srcset` from the variants plus the default rendition, narrowest first. */
export function caseMediaSrcSet(media: CaseMedia): string {
  return [...(media.variants ?? []), { src: media.src, width: media.width }]
    .sort((a, b) => a.width - b.width)
    .map((rendition) => `${rendition.src} ${rendition.width}w`)
    .join(", ");
}
