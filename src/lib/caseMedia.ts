import type { CaseMedia } from "../content/portfolio";

/**
 * The drawer column, from its CSS: `min(55rem, 74vw) - 2 * clamp(1.5rem, 4vw, 4rem)` from 761px, which is 66vw up to
 * ~1190px and at most ~49rem above; `100vw - 2.3rem` on phones. Tiles fill a `minmax(18rem, 1fr)` grid with a 1.5rem
 * gap, so they sit two per row only once the column reaches 37.5rem (~910px), one per row below. Measured in the
 * browser (lead 502-778px, tiles 326-594px); e2e checks that each viewport downloads the smallest rendition that
 * covers the box.
 */
export const caseMediaSizes = {
  hero: "(min-width: 1190px) 49rem, (min-width: 761px) 66vw, calc(100vw - 2.3rem)",
  tile: "(min-width: 1190px) 24rem, (min-width: 910px) 33vw, (min-width: 761px) 66vw, calc(100vw - 2.3rem)",
} as const;

/** `srcset` from the variants plus the default rendition, narrowest first. */
export function caseMediaSrcSet(media: CaseMedia): string {
  return [...(media.variants ?? []), { src: media.src, width: media.width }]
    .sort((a, b) => a.width - b.width)
    .map((rendition) => `${rendition.src} ${rendition.width}w`)
    .join(", ");
}
