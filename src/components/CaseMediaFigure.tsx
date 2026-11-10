import { useState } from "react";
import type { CaseMedia, PortfolioContent } from "../content/portfolio";
import { caseMediaSizes, caseMediaSrcSet } from "../lib/caseMedia";

type CaseMediaUi = Pick<PortfolioContent["ui"], "drawerMediaOpen" | "opensNewTab">;

/**
 * One image of visual evidence. A failed load removes only its own figure and leaves the text
 * layout intact. The full-size link replaces a lightbox: the browser provides zoom, focus and
 * scroll for free.
 */
function CaseMediaFigure({ media, ui, lead }: { media: CaseMedia; ui: CaseMediaUi; lead: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <figure className={`case-media ${lead ? "case-media--lead" : "case-media--tile"}`}>
      <img
        className="case-media__image"
        src={media.src}
        srcSet={caseMediaSrcSet(media)}
        sizes={lead ? caseMediaSizes.hero : caseMediaSizes.tile}
        width={media.width}
        height={media.height}
        alt={media.alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <figcaption>
        <span className="case-media__caption">{media.caption}</span>
        <span className="case-media__provenance mono-label">{media.provenance}</span>
        <a
          className="item-link mono-label case-media__open"
          href={media.src}
          target="_blank"
          rel="noopener noreferrer"
        >
          {ui.drawerMediaOpen}
          <span aria-hidden="true"> ↗</span>
          <span className="visually-hidden"> {ui.opensNewTab}</span>
        </a>
      </figcaption>
    </figure>
  );
}

/**
 * The visual evidence of a case: the first image leads at full width, the others sit below as
 * tiles. Rendered only while the drawer is open, so no case asset is requested before it is needed.
 */
export function CaseMediaGallery({ items, ui }: { items: CaseMedia[]; ui: CaseMediaUi }) {
  if (items.length === 0) return null;
  const [lead, ...tiles] = items;

  return (
    <div className="case-media-set">
      <CaseMediaFigure key={lead.src} media={lead} ui={ui} lead />
      {tiles.length > 0 && (
        <div className="case-media-set__tiles">
          {tiles.map((media) => (
            <CaseMediaFigure key={media.src} media={media} ui={ui} lead={false} />
          ))}
        </div>
      )}
    </div>
  );
}
