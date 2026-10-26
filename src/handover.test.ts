import { describe, expect, it } from "vitest";
import { suggestHandover } from "./handover.js";

describe("suggestHandover", () => {
  it("prefers an idle agent in the same project", () => {
    const s = suggestHandover("Ana", "D:/p", [
      { name: "Bob", projectDir: "D:/other", status: "idle" },
      { name: "Cid", projectDir: "D:/p", status: "idle" },
    ]);
    expect(s).toEqual({ from: "Ana", to: "Cid", reason: "Cid is idle in the same project", needsApproval: true });
  });
  it("falls back to any idle agent", () => {
    const s = suggestHandover("Ana", "D:/p", [
      { name: "Bob", projectDir: "D:/other", status: "idle" },
      { name: "Cid", projectDir: "D:/p", status: "active" },
    ]);
    expect(s?.to).toBe("Bob");
  });
  it("returns null when nobody is idle", () => {
    expect(suggestHandover("Ana", "D:/p", [{ name: "Bob", projectDir: "D:/p", status: "active" }])).toBeNull();
    expect(suggestHandover("Ana", "D:/p", [])).toBeNull();
  });
});
