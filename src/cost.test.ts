import { describe, expect, it } from "vitest";
import { budgetStatus, formatApproxUSD } from "./cost.js";

describe("formatApproxUSD", () => {
  it("rounds to whole dollars", () => {
    expect(formatApproxUSD(1240)).toBe("~$12");
    expect(formatApproxUSD(199)).toBe("~$2");
  });
  it("says <$1 for pocket change", () => {
    expect(formatApproxUSD(42)).toBe("<$1");
  });
});

describe("budgetStatus", () => {
  it("reports spend inside budget", () => {
    expect(budgetStatus("Ana", 320, 2000)).toEqual({ over: false, line: "Ana spent ~$3 of ~$20" });
  });
  it("trips at the limit", () => {
    const s = budgetStatus("Ana", 2000, 2000);
    expect(s.over).toBe(true);
    expect(s.line).toMatch(/over/);
  });
});
