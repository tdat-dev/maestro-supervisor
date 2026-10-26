import { describe, expect, it } from "vitest";
import { classifyCommand } from "./gate.js";

describe("classifyCommand", () => {
  it.each([
    ["rm -rf dist", "recursive or wildcard delete"],
    ["rm src/*.log", "recursive or wildcard delete"],
    ["git push --force origin main", "force push rewrites shared history"],
    ["git reset --hard HEAD", "hard reset discards uncommitted work"],
    ["DROP TABLE users", "drops a table or database"],
  ])("blocks %s (%s)", (cmd, reason) => {
    expect(classifyCommand(cmd)).toEqual({ risky: true, reason });
  });
  it("catches rm -rf chained after another command", () => {
    expect(classifyCommand("npm test && rm -rf dist")).toMatchObject({ risky: true });
  });
  it.each([["npm test"], ["git status"], ["rm one-file.tmp"], ["rm my-report.txt"], ["git push origin main"]])(
    "lets %s through",
    (cmd) => {
      expect(classifyCommand(cmd)).toEqual({ risky: false, reason: null });
    },
  );
});
