/**
 * The navigation arrows as drawn icons (UX-04 #75): none of the three web fonts has U+2192 or U+2197, and iOS draws ↗
 * from Apple Color Emoji. "in" (→) for controls that stay in the page, "out" (↗) only for links that leave it (#26).
 * Decorative: the accessible name stays the text beside it; the stroke is the text colour, system colours included.
 */
export function Arrow({ kind }: { kind: "in" | "out" }) {
  return (
    <svg data-arrow={kind} viewBox="0 0 16 16" width="0.8em" height="0.8em" aria-hidden="true" focusable="false">
      <path d={kind === "in" ? "M.5 8h15M11 3.5 15.5 8 11 12.5" : "M4 12 12 4M5.5 4H12v6.5"} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
