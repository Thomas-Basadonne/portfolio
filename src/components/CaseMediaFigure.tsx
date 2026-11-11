import { useRef, useState } from "react";
import type { CaseMedia, PortfolioContent } from "../content/portfolio";
import { caseMediaSizes, caseMediaSrcSet } from "../lib/caseMedia";

type CaseMediaUi = Pick<PortfolioContent["ui"], "drawerMediaOpen" | "opensNewTab">;

type FigureProps = { media: CaseMedia; ui: CaseMediaUi; lead: boolean; onFocusLost: () => void };

/**
 * One image of visual evidence. A failed load removes only its own figure and leaves the text
 * layout intact; if focus was inside it, it moves to `onFocusLost` instead of falling to <body>.
 * The full-size link replaces a lightbox: the browser provides zoom, focus and scroll for free.
 * The gallery exists only inside the open drawer, where the lead is in view: it loads eagerly and first.
 */
function CaseMediaFigure({ media, ui, lead, onFocusLost }: FigureProps) {
  const [failed, setFailed] = useState(false);
  const figureRef = useRef<HTMLElement>(null);
  if (failed) return null;

  const fail = () => {
    if (figureRef.current?.contains(document.activeElement)) onFocusLost();
    setFailed(true);
  };

  return (
    <figure ref={figureRef} className={`case-media ${lead ? "case-media--lead" : "case-media--tile"}`}>
      <img
        className="case-media__image"
        src={media.src}
        srcSet={caseMediaSrcSet(media)}
        sizes={lead ? caseMediaSizes.hero : caseMediaSizes.tile}
        width={media.width}
        height={media.height}
        alt={media.alt}
        loading={lead ? "eager" : "lazy"}
        fetchPriority={lead ? "high" : undefined}
        decoding="async"
        onError={fail}
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
export function CaseMediaGallery({ items, ui, onFocusLost = () => {} }: { items: CaseMedia[]; ui: CaseMediaUi; onFocusLost?: () => void }) {
  if (items.length === 0) return null;
  const [lead, ...tiles] = items;

  return (
    <div className="case-media-set">
      <CaseMediaFigure key={lead.src} media={lead} ui={ui} lead onFocusLost={onFocusLost} />
      {tiles.length > 0 && (
        <div className="case-media-set__tiles">
          {tiles.map((media) => (
            <CaseMediaFigure key={media.src} media={media} ui={ui} lead={false} onFocusLost={onFocusLost} />
          ))}
        </div>
      )}
    </div>
  );
}
