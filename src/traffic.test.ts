import { describe, expect, it } from "vitest";
import { alertToLight } from "./traffic.js";
import type { StuckAlert } from "./stuck.js";

const alert = (over: Partial<StuckAlert> = {}): StuckAlert => ({
  agentId: "p1",
  name: "Ana",
  projectDir: "D:/p",
  kind: "no-output",
  detail: "Ana produced no output for 12m",
  ...over,
});

describe("alertToLight", () => {
  it("greens a healthy agent", () => {
    expect(alertToLight(null, "Ana")).toEqual({ light: "green", line: "Ana is running fine." });
  });
  it("reds stuck and looping agents", () => {
    expect(alertToLight(alert({ kind: "no-output" }), "Ana").light).toBe("red");
    expect(alertToLight(alert({ kind: "loop", detail: "Ana loops 5x" }), "Ana")).toEqual({
      light: "red",
      line: "Ana loops 5x",
    });
  });
  it("yellows an agent waiting on the user", () => {
    expect(alertToLight(alert({ kind: "waiting", detail: "Ana waited 5m" }), "Ana")).toEqual({
      light: "yellow",
      line: "Ana waited 5m",
    });
  });
});
