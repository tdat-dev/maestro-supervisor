// Report freshness for agent-written summaries: fresh, stale (not updated
// for STALE_AFTER_MS), or missing (no file or blank). The watch loop prints
// on state change, so a silent agent shows up once as NO-REPORT instead of
// vanishing quietly. Plain fs behind injectable deps for tests.

import { readFileSync, statSync } from "node:fs";
import { readAgentSummary, summaryPath } from "./selfsummary.js";

export const STALE_AFTER_MS = 30 * 60_000;

export type SummaryStatus =
  | { kind: "fresh"; text: string }
  | { kind: "stale"; text: string; ageMs: number }
  | { kind: "missing" };

export interface SummaryFs {
  statMtimeMs(path: string): number;
  readText(path: string): string;
}

const realFs: SummaryFs = {
  statMtimeMs: (p) => statSync(p).mtimeMs,
  readText: (p) => readFileSync(p, "utf8"),
};

/** Classify one agent's report. Missing covers no-file AND blank-file: both
 *  mean the dashboard has nothing usable to show. */
export function classifySummary(
  projectDir: string,
  paneName: string,
  nowMs: number,
  fs: SummaryFs = realFs,
): SummaryStatus {
  const p = summaryPath(projectDir, paneName);
  let mtime: number;
  try {
    mtime = fs.statMtimeMs(p);
  } catch {
    return { kind: "missing" };
  }
  const text = readAgentSummary(projectDir, paneName, (q) => {
    if (q !== p) throw new Error(`unexpected path ${q}`);
    return fs.readText(q);
  });
  if (text === null) return { kind: "missing" };
  const ageMs = Math.max(0, nowMs - mtime);
  return ageMs > STALE_AFTER_MS ? { kind: "stale", text, ageMs } : { kind: "fresh", text };
}
