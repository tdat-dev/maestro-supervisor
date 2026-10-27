import { describe, expect, it } from "vitest";
import { STALE_AFTER_MS, classifySummary, type SummaryFs } from "./summarystatus.js";

const NOW = 1_000_000_000;

function fakeFs(opts: { mtime?: number; text?: string; statThrows?: boolean }): SummaryFs {
  return {
    statMtimeMs: () => {
      if (opts.statThrows) throw new Error("ENOENT");
      return opts.mtime ?? NOW;
    },
    readText: () => opts.text ?? "",
  };
}

describe("classifySummary", () => {
  it("missing when the file is absent", () => {
    expect(classifySummary("/w", "Ana", NOW, fakeFs({ statThrows: true }))).toEqual({ kind: "missing" });
  });

  it("missing when the file is blank", () => {
    expect(classifySummary("/w", "Ana", NOW, fakeFs({ text: "  \n " }))).toEqual({ kind: "missing" });
  });

  it("fresh when recently updated", () => {
    expect(classifySummary("/w", "Ana", NOW, fakeFs({ mtime: NOW - 1000, text: "Doing: x" }))).toEqual({
      kind: "fresh",
      text: "Doing: x",
    });
  });

  it("stale past the threshold, with age", () => {
    const st = classifySummary("/w", "Ana", NOW, fakeFs({ mtime: NOW - STALE_AFTER_MS - 1, text: "Doing: x" }));
    expect(st.kind).toBe("stale");
    if (st.kind === "stale") {
      expect(st.text).toBe("Doing: x");
      expect(st.ageMs).toBe(STALE_AFTER_MS + 1);
    }
  });

  it("fresh exactly at the threshold", () => {
    const st = classifySummary("/w", "Ana", NOW, fakeFs({ mtime: NOW - STALE_AFTER_MS, text: "Doing: x" }));
    expect(st.kind).toBe("fresh");
  });

  it("clamps future mtimes to age zero", () => {
    const st = classifySummary("/w", "Ana", NOW, fakeFs({ mtime: NOW + 5000, text: "Doing: x" }));
    expect(st).toEqual({ kind: "fresh", text: "Doing: x" });
  });
});
