// Stuck / waiting-too-long / loop detector over fleet snapshots. Pure:
// feed it one sample per agent per poll and it reports alerts. The snapshot
// carries no per-agent clock, so "no output" is derived here from the screen
// tail changing between polls.

import { createHash } from "node:crypto";

/** One agent as seen in one poll. */
export interface AgentSample {
  id: string;
  name: string;
  projectDir: string;
  status: string;
  /** Non-null once the agent finished ("done", "review", …). */
  finished: string | null;
  /** Short hash of the screen tail ("" when the agent shows nothing). */
  tailHash: string;
  at: number;
}

export function tailHash(tail: string): string {
  if (!tail.trim()) return "";
  return createHash("sha1").update(tail).digest("hex").slice(0, 12);
}

interface Tracked {
  name: string;
  projectDir: string;
  status: string;
  finished: string | null;
  lastChangeAt: number;
  lastHash: string;
  /** Consecutive polls with the same non-empty tail while active. */
  repeats: number;
  statusSince: number;
}

export type TrackerState = Record<string, Tracked>;

export interface StuckAlert {
  agentId: string;
  name: string;
  projectDir: string;
  kind: "no-output" | "waiting" | "loop";
  detail: string;
}

export interface DetectorOptions {
  /** Running, unfinished, tail unchanged for this long ⇒ stuck. */
  noOutputMs: number;
  /** "needs" for this long ⇒ waiting too long. */
  needsMs: number;
  /** Same tail this many polls in a row while active ⇒ possible loop. */
  loopRepeats: number;
}

export const DEFAULT_DETECTOR_OPTIONS: DetectorOptions = {
  noOutputMs: 10 * 60_000,
  needsMs: 5 * 60_000,
  loopRepeats: 6,
};

/** Fold one poll's samples into the tracker. */
export function updateTracker(
  prev: TrackerState,
  samples: AgentSample[],
): TrackerState {
  const next: TrackerState = {};
  for (const s of samples) {
    const p = prev[s.id];
    const changed = !p || p.lastHash !== s.tailHash;
    const statusChanged = !p || p.status !== s.status;
    const active = s.status === "active" && !s.finished;
    next[s.id] = {
      name: s.name,
      projectDir: s.projectDir,
      status: s.status,
      finished: s.finished,
      lastChangeAt: changed ? s.at : (p?.lastChangeAt ?? s.at),
      lastHash: s.tailHash,
      repeats: !changed && active && s.tailHash ? (p?.repeats ?? 0) + 1 : 0,
      statusSince: statusChanged ? s.at : (p?.statusSince ?? s.at),
    };
  }
  return next;
}

const mins = (ms: number): string =>
  ms >= 60_000 ? `${Math.round(ms / 60_000)}m` : `${Math.round(ms / 1000)}s`;

/** Alerts for the tracked agents at `now`. A finished or stopped agent is
 *  never stuck; idleness alone (waiting at a prompt) is not stuck either. */
export function detectStuck(
  state: TrackerState,
  now: number,
  opts: DetectorOptions = DEFAULT_DETECTOR_OPTIONS,
): StuckAlert[] {
  const out: StuckAlert[] = [];
  for (const [agentId, t] of Object.entries(state)) {
    if (t.finished || t.status === "stopped") continue;
    if (t.status === "needs" && now - t.statusSince >= opts.needsMs) {
      out.push({
        agentId,
        name: t.name,
        projectDir: t.projectDir,
        kind: "waiting",
        detail: `${t.name} has waited on the user for ${mins(now - t.statusSince)}`,
      });
      continue;
    }
    if (t.repeats >= opts.loopRepeats) {
      out.push({
        agentId,
        name: t.name,
        projectDir: t.projectDir,
        kind: "loop",
        detail: `${t.name} shows the same screen ${t.repeats} polls in a row while active`,
      });
      continue;
    }
    if (now - t.lastChangeAt >= opts.noOutputMs) {
      out.push({
        agentId,
        name: t.name,
        projectDir: t.projectDir,
        kind: "no-output",
        detail: `${t.name} produced no output for ${mins(now - t.lastChangeAt)}`,
      });
    }
  }
  return out;
}
