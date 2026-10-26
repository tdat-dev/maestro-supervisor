import { describe, expect, it } from "vitest";
import { parseFleetSnapshot } from "./fleet.js";

describe("parseFleetSnapshot", () => {
  it("parses agents and screen tails", () => {
    const snap = parseFleetSnapshot({
      agents: [
        { id: "p1", name: "Ana", wsId: "w", wsName: "proj", project: "proj", projectKey: "k", projectDir: "D:/p", status: "active", uptime: "1m", finished: null, files: null, finish: null },
      ],
      output: { p1: "hello" },
    });
    expect(snap.agents).toHaveLength(1);
    expect(snap.agents[0]).toMatchObject({ id: "p1", name: "Ana", status: "active" });
    expect(snap.output).toEqual({ p1: "hello" });
  });
  it("tolerates garbage", () => {
    expect(parseFleetSnapshot(null)).toEqual({ agents: [], output: {} });
    expect(parseFleetSnapshot({})).toEqual({ agents: [], output: {} });
    expect(parseFleetSnapshot({ agents: [null], output: { p1: 42 } })).toEqual({
      agents: [{ id: "", name: "", wsId: "", wsName: "", project: "", projectKey: "", projectDir: "", status: "stopped", uptime: "", finished: null, files: null, finish: null }],
      output: {},
    });
  });
});
