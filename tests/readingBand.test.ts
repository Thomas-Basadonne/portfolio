import { describe, expect, it } from "vitest";
import { bandCutPx, bandOpenTarget, type BandTarget } from "../src/lib/readingBand";

// Portrait phone 390x844: full band 350px (header 80 + 32svh), reading band 80 + 16svh = 215px.
const base: BandTarget = {
  chapter: 1,
  narrowable: true,
  zoneTop: 215,
  zoneBottom: 350,
  gaps: [],
  caseIndexTop: Number.POSITIVE_INFINITY,
};

describe("reading band target", () => {
  it("stays full where the layout has no reading band to narrow to", () => {
    for (let chapter = 0; chapter <= 5; chapter += 1) {
      expect(bandOpenTarget({ ...base, chapter, narrowable: false }), `chapter ${chapter}`).toBe(1);
    }
  });

  it("keeps the hero and the finale full", () => {
    expect(bandOpenTarget({ ...base, chapter: 0 })).toBe(1);
    expect(bandOpenTarget({ ...base, chapter: 5 })).toBe(1);
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

  it("keeps Work full at the chapter start and narrows once the case index reaches the full band", () => {
    expect(bandOpenTarget({ ...base, chapter: 3, caseIndexTop: 600 })).toBe(1);
    expect(bandOpenTarget({ ...base, chapter: 3, caseIndexTop: 350 })).toBe(0);
    expect(bandOpenTarget({ ...base, chapter: 3, caseIndexTop: 120 })).toBe(0);
  });
});

describe("reading band cut", () => {
  it("cuts nothing while the band is full and the whole reading gap while it is narrowed", () => {
    expect(bandCutPx({ open: 1, full: 350, reading: 215 })).toBe(0);
    expect(bandCutPx({ open: 0, full: 350, reading: 215 })).toBe(135);
    expect(bandCutPx({ open: 0.5, full: 350, reading: 215 })).toBe(67.5);
  });

  it("never cuts a band that is already shorter than the reading band (short phones)", () => {
    expect(bandCutPx({ open: 0, full: 173, reading: 215 })).toBe(0);
  });
});
