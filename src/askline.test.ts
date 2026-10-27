import { describe, expect, it } from "vitest";
import { askPrint } from "./askline.js";

const RUN_TAIL = [
  "Do you want to proceed?",
  "❯ 1. Yes, allow once",
  "  2. No",
  "Enter to select · Esc to cancel",
].join("\n");

describe("askPrint", () => {
  it("returns null when the tail shows no question", () => {
    expect(askPrint("Ana", "compiling…\nline 2\nok")).toBeNull();
    expect(askPrint("Ana", "")).toBeNull();
  });

  it("prints the question with the agent name and kind", () => {
    const p = askPrint("Ana", RUN_TAIL);
    expect(p).not.toBeNull();
    expect(p!.lines[0]).toContain("? ASKS Ana (run):");
    expect(p!.lines[0]).toContain("proceed");
  });

  it("recommends the safe answer", () => {
    const p = askPrint("Ana", RUN_TAIL);
    expect(p!.lines[1]).toContain("safe:");
    expect(p!.lines[1]).toContain("No");
  });

  it("keeps a stable key for the same screen", () => {
    expect(askPrint("Ana", RUN_TAIL)!.key).toBe(askPrint("Ana", RUN_TAIL)!.key);
  });
});
