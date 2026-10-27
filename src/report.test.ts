import { describe, expect, it } from "vitest";
import { formatVerdictLine } from "./report.js";

describe("formatVerdictLine", () => {
  it("prints a red verdict with the reason", () => {
    expect(
      formatVerdictLine("Ana", "done", {
        ok: false,
        level: "red",
        reason: "Not runnable: login step fails.",
        recheckable: true,
      }),
    ).toBe("= VERDICT Ana [done]: RED Not runnable: login step fails.");
  });
  it("prints a green verdict", () => {
    expect(
      formatVerdictLine("Ana", "done", {
        ok: true,
        level: "green",
        reason: "Done: diff, tests and board card all check out.",
        recheckable: true,
      }),
    ).toBe("= VERDICT Ana [done]: GREEN Done: diff, tests and board card all check out.");
  });
});
