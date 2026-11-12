import { describe, expect, it } from "vitest";
import { bandCutPx, bandOpenTarget, type BandTarget } from "../src/lib/readingBand";

// Portrait phone 390x844: full band 350px (header 80 + 32svh), reading band 80 + 18svh = 232px.
const base: BandTarget = {
  chapter: 1,
  narrowable: true,
  zoneTop: 232,
  zoneBottom: 350,
  gaps: [],
  contactTop: Number.POSITIVE_INFINITY,
};

describe("reading band target", () => {
  it("stays full where the layout has no reading band to narrow to", () => {
    for (let chapter = 0; chapter <= 5; chapter += 1) {
      expect(bandOpenTarget({ ...base, chapter, narrowable: false, contactTop: 100 }), `chapter ${chapter}`).toBe(1);
    }
  });

  it("keeps the hero full", () => {
    expect(bandOpenTarget({ ...base, chapter: 0 })).toBe(1);
  });

  it("narrows to the reading band in the reading chapters 01, 02 and 04", () => {
    for (const chapter of [1, 2, 4]) {
      expect(bandOpenTarget({ ...base, chapter }), `chapter ${chapter}`).toBe(0);
    }
  });

  it("widens for the change of chapter only while the empty band between two chapters sits under the full band", () => {
    const inside = { top: 150, bottom: 380 };
    const partial = { top: 250, bottom: 380 };
    expect(bandOpenTarget({ ...base, gaps: [inside] })).toBe(1);
    expect(bandOpenTarget({ ...base, gaps: [partial] })).toBe(0);
  });

  it("keeps Work full only in the empty space before its heading, never over the intro", () => {
    expect(bandOpenTarget({ ...base, chapter: 3 })).toBe(0);
    expect(bandOpenTarget({ ...base, chapter: 3, gaps: [{ top: 150, bottom: 380 }] })).toBe(1);
    expect(bandOpenTarget({ ...base, chapter: 3, gaps: [{ top: 250, bottom: 380 }] })).toBe(0);
  });

  it("keeps the finale full while the first contact link clears the full band", () => {
    expect(bandOpenTarget({ ...base, chapter: 5, contactTop: 400 })).toBe(1);
    expect(bandOpenTarget({ ...base, chapter: 5 })).toBe(1);
  });

  it("narrows the finale to the first contact link, never past the reading band", () => {
    // Visible bottom = clamp(contactTop, reading, full): 300 px sits 50 px above the full band's bottom.
    expect(bandOpenTarget({ ...base, chapter: 5, contactTop: 300 })).toBeCloseTo(1 - 50 / 118, 6);
    expect(bandOpenTarget({ ...base, chapter: 5, contactTop: 100 })).toBe(0);
  });
});

describe("reading band cut", () => {
  it("cuts nothing while the band is full and the whole reading gap while it is narrowed", () => {
    expect(bandCutPx({ open: 1, full: 350, reading: 232 })).toBe(0);
    expect(bandCutPx({ open: 0, full: 350, reading: 232 })).toBe(118);
    expect(bandCutPx({ open: 0.5, full: 350, reading: 232 })).toBe(59);
  });

  it("never cuts a band that is already shorter than the reading band (short phones)", () => {
    expect(bandCutPx({ open: 0, full: 173, reading: 232 })).toBe(0);
  });
});
