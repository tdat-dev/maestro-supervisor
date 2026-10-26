import { describe, expect, it } from "vitest";
import {
  DEFAULT_DETECTOR_OPTIONS,
  detectStuck,
  updateTracker,
  type AgentSample,
  type TrackerState,
} from "./stuck.js";

const MIN = 60_000;
const sample = (over: Partial<AgentSample> = {}): AgentSample => ({
  id: "p1",
  name: "Ana",
  projectDir: "D:/p",
  status: "active",
  finished: null,
  tailHash: "h1",
  at: 0,
  ...over,
});
const OPTS = { ...DEFAULT_DETECTOR_OPTIONS, noOutputMs: 10 * MIN, needsMs: 5 * MIN, loopRepeats: 3 };

function track(samples: AgentSample[]): TrackerState {
  return updateTracker({}, samples);
}

describe("detectStuck", () => {
  it("flags no output after the timeout", () => {
    const s = track([sample({ at: 0 })]);
    expect(detectStuck(s, 9 * MIN, OPTS)).toEqual([]);
    const [alert] = detectStuck(s, 11 * MIN, OPTS);
    expect(alert).toMatchObject({ kind: "no-output", name: "Ana" });
  });
  it("resets when the screen changes", () => {
    let s = track([sample({ at: 0, tailHash: "h1" })]);
    s = updateTracker(s, [sample({ at: 9 * MIN, tailHash: "h2" })]);
    expect(detectStuck(s, 11 * MIN, OPTS)).toEqual([]);
  });
  it("flags waiting on the user for too long", () => {
    const s = track([sample({ at: 0, status: "needs" })]);
    expect(detectStuck(s, 6 * MIN, OPTS)).toMatchObject([{ kind: "waiting" }]);
  });
  it("flags a repeating screen while active as a possible loop", () => {
    let s = track([sample({ at: 0 })]);
    s = updateTracker(s, [sample({ at: MIN })]);
    s = updateTracker(s, [sample({ at: 2 * MIN })]);
    s = updateTracker(s, [sample({ at: 3 * MIN })]);
    expect(detectStuck(s, 3 * MIN, OPTS)).toMatchObject([{ kind: "loop" }]);
  });
  it("never flags finished or stopped agents", () => {
    const s = track([
      sample({ id: "done", name: "Bob", finished: "done", at: 0 }),
      sample({ id: "stop", name: "Cid", status: "stopped", at: 0 }),
    ]);
    expect(detectStuck(s, 60 * MIN, OPTS)).toEqual([]);
  });
  it("idleness alone is not stuck", () => {
    const s = track([sample({ at: 0, status: "idle" })]);
    expect(detectStuck(s, 3 * MIN, OPTS)).toEqual([]);
  });
});
