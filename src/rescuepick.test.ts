import { describe, expect, it } from "vitest";
import { pickRescue } from "./rescuepick.js";
import { explainLine, nudgeLine } from "./rescue.js";

describe("pickRescue", () => {
  it("nudges a silent agent", () => {
    expect(pickRescue("no-output")).toEqual({ kind: "nudge", line: nudgeLine() });
  });

  it("asks a looping agent to explain instead of retrying blind", () => {
    expect(pickRescue("loop")).toEqual({ kind: "explain", line: explainLine() });
  });

  it("picks nothing for waiting (the asking slice answers questions)", () => {
    expect(pickRescue("waiting")).toBeNull();
  });
});
