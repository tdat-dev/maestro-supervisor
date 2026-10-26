import { describe, expect, it } from "vitest";
import { buildProgressPrompt } from "./summarize.js";

describe("buildProgressPrompt", () => {
  it("packs status, cards and screen tail into the prompt", () => {
    const p = buildProgressPrompt({
      name: "Ana",
      status: "active",
      uptime: "12m",
      cards: ["Fix login"],
      tail: "> running tests…",
    });
    expect(p).toContain("Ana");
    expect(p).toContain("Fix login");
    expect(p).toContain("running tests");
  });
});
